// Uso: node --test demo/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parse, build } = require('./support.js');

const PROJECT = path.resolve(__dirname, '..', 'project');
const screens = fs.readdirSync(PROJECT).filter((f) => f.endsWith('.dc.html'));

test('as 16 telas têm template bem formado', () => {
  assert.strictEqual(screens.length, 16);
  for (const f of screens) {
    const src = fs.readFileSync(path.join(PROJECT, f), 'utf8');
    assert.doesNotThrow(() => parse(src.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1]), f);
  }
});

test('sc-for dentro de tbody fica na linha certa', () => {
  const [table] = build(parse('<table><tbody><sc-for list="{{rows}}" as="r"><tr><td>{{r.n}}</td></tr></sc-for></tbody></table>'), { rows: [{ n: 'a' }, { n: 'b' }] });
  const trs = table.children[0].children;
  assert.deepStrictEqual(trs.map((t) => t.children[0].children[0].text), ['a', 'b']);
});

test('sc-if oculta quando falso, mesmo com hint verdadeiro', () => {
  const out = build(parse('<sc-if value="{{x}}" hint-placeholder-val="{{true}}"><b>oi</b></sc-if>'), { x: false });
  assert.deepStrictEqual(out, []);
});

test('atributo com expressão única mantém a função; misto vira texto', () => {
  const fn = () => {};
  const [el] = build(parse('<button onClick="{{go}}" style="width:{{w}}" title="{{nada}}">A &amp; B</button>'), { go: fn, w: '50%' });
  assert.strictEqual(el.on.onClick, fn);
  assert.strictEqual(el.attrs.style, 'width:50%');
  assert.ok(!('title' in el.attrs));
  assert.strictEqual(el.children[0].text, 'A & B');
});

test('tag fechada errada gera erro', () => {
  assert.throws(() => parse('<div><span></div>'));
});

test('filhos de svg ficam marcados como svg', () => {
  const [svg] = build(parse('<svg viewBox="0 0 1 1"><path d="{{d}}"></path></svg>'), { d: 'M0 0' });
  assert.ok(svg.children[0].svg);
  assert.strictEqual(svg.attrs.viewBox, '0 0 1 1');
});
