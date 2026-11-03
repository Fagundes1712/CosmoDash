// Verificação sem dependências: sintaxe de JS e JSON, scripts das telas e segredos expostos.
// Uso: node scripts/check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', 'dist']);
const SECRETS = [
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const hasSecret = (text) => SECRETS.some((re) => re.test(text));

// Devolve os problemas de um arquivo; vazio quando está tudo certo.
function checkFile(name, text) {
  const problems = [];
  const base = path.basename(name);
  if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') problems.push('arquivo .env não pode ir para o repositório');
  if (hasSecret(text)) problems.push('parece conter um segredo');
  const parse = (code) => {
    try { new vm.Script(code, { filename: name }); } catch (e) { problems.push('sintaxe: ' + e.message); }
  };
  if (name.endsWith('.js')) parse(text);
  if (name.endsWith('.json')) {
    try { JSON.parse(text); } catch (e) { problems.push('JSON: ' + e.message); }
  }
  if (name.endsWith('.dc.html')) {
    for (const m of text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) parse(m[1]);
  }
  return problems;
}

if (require.main === module) {
  let failed = 0;
  const files = walk(ROOT);
  for (const f of files) {
    for (const p of checkFile(path.relative(ROOT, f), fs.readFileSync(f, 'utf8'))) {
      console.error(path.relative(ROOT, f) + ': ' + p);
      failed++;
    }
  }
  console.log(files.length + ' arquivos verificados, ' + failed + ' problemas');
  process.exit(failed ? 1 : 0);
}

module.exports = { checkFile };
