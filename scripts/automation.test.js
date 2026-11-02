// Uso: node --test scripts/automation.test.js
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { check } = require('../.claude/hooks/guard-git.js');
const { checkFile } = require('./check.js');

const HOOK = path.resolve(__dirname, '..', '.claude', 'hooks', 'guard-git.js');

test('guard-git bloqueia o que viola as regras', () => {
  const blocked = [
    ['git commit -m x', 'main'],
    ['git add . && git commit -m x', 'main'],
    ['git push', 'main'],
    ['git push origin main', 'feat/x'],
    ['git push -u origin HEAD:main', 'feat/x'],
    ['git push --force origin feat/x', 'feat/x'],
    ['git push origin +feat/x', 'feat/x'],
    ['git commit --no-verify -m x', 'feat/x'],
    ['git reset --hard HEAD~1', 'feat/x'],
    ['git clean -fd', 'feat/x'],
    ['git checkout -- .', 'feat/x'],
    ['git restore .', 'feat/x'],
    ['git stash clear', 'feat/x'],
    ['git branch -D feat/y', 'feat/x'],
    ['gh pr merge 3 --admin', 'feat/x'],
    ['gh repo delete x/y --yes', 'feat/x'],
    ['gh repo edit --visibility private', 'feat/x'],
    ['gh api -X DELETE repos/x/y/branches/main/protection', 'feat/x'],
  ];
  for (const [cmd, branch] of blocked) assert.ok(check(cmd, branch), cmd);
});

test('guard-git libera o fluxo normal', () => {
  const allowed = [
    ['git status', 'main'],
    ['git checkout -b feat/x', 'main'],
    ['git pull origin main', 'main'],
    ['git fetch origin main', 'feat/x'],
    ['git commit -m "ajusta main"', 'feat/x'],
    ['git push -u origin feat/x', 'feat/x'],
    ['git push --force-with-lease origin feat/x', 'feat/x'],
    ['git checkout -- demo/serve.js', 'feat/x'],
    ['gh pr create --base main --fill', 'feat/x'],
    ['gh issue list', 'feat/x'],
    ['gh api repos/x/y/branches/main/protection', 'feat/x'],
    ['npm test', 'main'],
  ];
  for (const [cmd, branch] of allowed) assert.strictEqual(check(cmd, branch), null, cmd);
});

test('guard-git como processo sai com 2 ao bloquear e 0 ao liberar', () => {
  const run = (command) => spawnSync('node', [HOOK], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8' });
  const denied = run('git reset --hard');
  assert.strictEqual(denied.status, 2);
  assert.match(denied.stderr, /guard-git/);
  assert.strictEqual(run('git status').status, 0);
});

test('check aponta segredos, .env e sintaxe quebrada', () => {
  assert.ok(checkFile('a.txt', 'x gh' + 'p_' + 'a'.repeat(36)).length);
  assert.ok(checkFile('.env', 'A=1').length);
  assert.deepStrictEqual(checkFile('.env.example', 'A='), []);
  assert.ok(checkFile('a.js', 'const = 1').length);
  assert.ok(checkFile('a.json', '{').length);
  assert.ok(checkFile('a.dc.html', '<script type="text/x-dc">const = 1</script>').length);
  assert.deepStrictEqual(checkFile('a.dc.html', '<script src="./x.js"></script><p>senha</p>'), []);
});
