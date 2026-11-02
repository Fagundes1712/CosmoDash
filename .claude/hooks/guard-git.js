// Hook PreToolUse: barra comandos que violam as regras do CLAUDE.md, mesmo se o modelo esquecer delas.
// Sai com código 2 para bloquear; a mensagem em stderr volta para o Claude.
const { execFileSync } = require('child_process');

const PROTECTED = 'main';
const RULES = [
  [/\bgit\b.*\s--no-verify\b/, 'não pule verificações com --no-verify'],
  [/\bgit\s+reset\b.*--hard\b/, 'git reset --hard descarta trabalho'],
  [/\bgit\s+clean\b.*\s-[a-z]*f/, 'git clean -f apaga arquivos não commitados'],
  [/\bgit\s+(checkout|restore)\b.*\s(--\s+)?\.(\s|$)/, 'descartaria alterações de todos os arquivos'],
  [/\bgit\s+stash\s+(drop|clear)\b/, 'descartaria trabalho guardado'],
  [/\bgit\s+branch\b.*\s-D\b/, 'apagar branch não integrada exige autorização'],
  [/\bgit\s+push\b.*(\s--force(?!-with-lease)\b|\s-f\b|\s\+\S)/, 'push forçado não é permitido'],
  [/\bgit\s+push\b.*\s--delete\b.*\bmain\b/, 'não apague a branch principal'],
  [/\bgh\s+pr\s+merge\b.*\s--admin\b/, 'não contorne a proteção da branch'],
  [/\bgh\s+repo\s+(delete|archive)\b/, 'operação destrutiva no repositório'],
  [/\bgh\s+repo\s+edit\b.*--visibility\b/, 'mudar a visibilidade exige autorização'],
  [/\bgh\s+api\b.*(-X|--method)[\s=]*DELETE\b/i, 'DELETE na API do GitHub exige autorização'],
];

// Devolve o motivo do bloqueio, ou null quando o comando pode seguir.
function check(command, branch) {
  for (const part of command.split(/&&|\|\||;|\n/)) {
    const cmd = part.trim();
    for (const [re, why] of RULES) if (re.test(cmd)) return why;
    if (/\bgit\s+commit\b/.test(cmd) && branch === PROTECTED) return 'não faça commit na main; crie uma branch';
    if (/\bgit\s+push\b/.test(cmd)) {
      const args = cmd.replace(/^.*?\bgit\s+push\b/, '').split(/\s+/).filter((a) => a && !a.startsWith('-'));
      if (args.slice(1).some((a) => a.split(':').pop().replace('refs/heads/', '') === PROTECTED)) return 'não envie direto para a main; abra um PR';
      if (args.length < 2 && branch === PROTECTED) return 'não envie direto para a main; abra um PR';
    }
  }
  return null;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (d) => (raw += d));
  process.stdin.on('end', () => {
    const input = JSON.parse(raw);
    const why = check(input.tool_input?.command || '', currentBranch(input.cwd || process.cwd()));
    if (why) {
      console.error('Bloqueado pelo guard-git: ' + why + '. Se for mesmo necessário, peça ao usuário.');
      process.exit(2);
    }
  });
}

module.exports = { check };
