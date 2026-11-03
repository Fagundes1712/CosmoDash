// Confere se o site publicado responde: página inicial, telas e arquivos compartilhados.
// Uso: node scripts/smoke.js <url-base>   (ex.: https://fagundes1712.github.io/CosmoDash/)
const fs = require('fs');
const path = require('path');

const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS) || 10;
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS) || 15000;

async function checkSite(base) {
  const root = base.endsWith('/') ? base : base + '/';
  const screens = fs.readdirSync(path.resolve(__dirname, '..', 'project')).filter((f) => f.endsWith('.dc.html'));
  const problems = [];
  for (const file of ['', 'support.js', 'CosmoDash.css', ...screens]) {
    const res = await fetch(root + file).catch((e) => ({ ok: false, status: e.message }));
    if (!res.ok) { problems.push((file || 'página inicial') + ': ' + res.status); continue; }
    if (file.endsWith('.dc.html') && !(await res.text()).includes('<x-dc>')) problems.push(file + ': sem o template da tela');
  }
  return problems;
}

async function main() {
  const base = process.argv[2];
  if (!base) { console.error('Informe a URL base'); process.exit(2); }
  // A publicação pode levar alguns instantes para propagar.
  for (let i = 1; i <= ATTEMPTS; i++) {
    const problems = await checkSite(base);
    if (!problems.length) return console.log('Site OK em ' + base);
    console.error('Tentativa ' + i + '/' + ATTEMPTS + ':\n  ' + problems.join('\n  '));
    if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  process.exit(1);
}

main();
