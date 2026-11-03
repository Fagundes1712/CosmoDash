// Monta o site estático em dist/: as telas de project/, o runtime da demo e a página inicial.
// Uso: node scripts/build.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'project'), DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'demo', 'support.js'), path.join(DIST, 'support.js'));
if (!fs.existsSync(path.join(DIST, 'Main.dc.html'))) throw new Error('project/Main.dc.html não existe');
fs.writeFileSync(
  path.join(DIST, 'index.html'),
  '<!doctype html><meta charset="utf-8"><title>CosmoDash</title><meta http-equiv="refresh" content="0; url=Main.dc.html"><a href="Main.dc.html">Abrir o CosmoDash</a>\n'
);
console.log('Site gerado em dist/');
