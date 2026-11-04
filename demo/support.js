// Runtime local das telas .dc.html. O support.js original não veio no pacote;
// este arquivo reimplementa só o que as telas usam ({{}}, sc-for, sc-if, DCLogic).
(function () {
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/y;
  const ATTR = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const EXPR = /\{\{\s*([\w.$]+)\s*\}\}/g;
  const WHOLE = /^\{\{\s*([\w.$]+)\s*\}\}$/;

  const decode = (t) => t.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);

  // Parser próprio: o parser do navegador tiraria <sc-for> de dentro de <tbody> e <tr>.
  function parse(html) {
    const root = { children: [] };
    const stack = [root];
    let i = 0;
    const add = (n) => stack[stack.length - 1].children.push(n);
    while (i < html.length) {
      const lt = html.indexOf('<', i);
      if (lt === -1) { add({ text: decode(html.slice(i)) }); break; }
      if (lt > i) add({ text: decode(html.slice(i, lt)) });
      if (html.startsWith('<!--', lt)) { i = html.indexOf('-->', lt) + 3; continue; }
      if (html[lt + 1] === '/') {
        const end = html.indexOf('>', lt);
        const name = html.slice(lt + 2, end).trim();
        const open = stack.pop();
        if (open.tag !== name) throw new Error('Tag </' + name + '> fecha <' + open.tag + '> na posição ' + lt);
        i = end + 1;
        continue;
      }
      TAG.lastIndex = lt;
      const m = TAG.exec(html);
      if (!m) throw new Error('Tag inválida na posição ' + lt);
      const attrs = {};
      for (const a of m[2].matchAll(ATTR)) attrs[a[1]] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      const node = { tag: m[1], attrs, children: [] };
      add(node);
      i = lt + m[0].length;
      if (m[1] === 'style') {
        const end = html.indexOf('</style>', i);
        node.children.push({ text: html.slice(i, end) });
        i = end + 8;
      } else if (!m[3] && !VOID.has(m[1])) stack.push(node);
    }
    if (stack.length > 1) throw new Error('Tag <' + stack[stack.length - 1].tag + '> sem fechamento');
    return root.children;
  }

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    return path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), scope);
  }

  const show = (v) => (v == null || v === false ? '' : String(v));
  const fill = (t, scope) => t.replace(EXPR, (_, p) => show(lookup(p, scope)));

  function attrValue(t, scope) {
    const whole = t.match(WHOLE);
    return whole ? lookup(whole[1], scope) : fill(t, scope);
  }

  const includes = {};

  // Resolve o template com os valores atuais e devolve a árvore a desenhar.
  function build(nodes, scope, svg = false) {
    const out = [];
    for (const n of nodes) {
      if (n.text !== undefined) { out.push({ text: fill(n.text, scope) }); continue; }
      if (n.tag === 'sc-for') {
        const list = attrValue(n.attrs.list, scope) || [];
        for (const item of list) out.push(...build(n.children, Object.assign(Object.create(scope), { [n.attrs.as]: item }), svg));
        continue;
      }
      if (n.tag === 'sc-include') {
        const name = n.attrs.name;
        includes[name] = includes[name] || parse(globalThis.Orb.templates[name]);
        out.push(...build(includes[name], scope, svg));
        continue;
      }
      if (n.tag === 'sc-if') {
        if (attrValue(n.attrs.value, scope)) out.push(...build(n.children, scope, svg));
        continue;
      }
      const isSvg = svg || n.tag === 'svg';
      const attrs = {}, on = {};
      for (const k in n.attrs) {
        if (k.startsWith('hint-')) continue;
        const v = attrValue(n.attrs[k], scope);
        if (/^on[A-Z]/.test(k)) on[k] = v;
        else if (v != null && v !== false) attrs[k] = String(v);
      }
      out.push({ tag: n.tag, svg: isSvg, attrs, on, children: build(n.children, scope, isSvg) });
    }
    return out;
  }

  if (typeof module !== 'undefined') { module.exports = { parse, build }; return; }

  const isField = (el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);

  function create(v) {
    if (v.text !== undefined) return document.createTextNode(v.text);
    return v.svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
  }

  function sameKind(el, v) {
    if (v.text !== undefined) return el.nodeType === 3;
    return el.nodeType === 1 && el.localName === v.tag;
  }

  function syncEl(el, v) {
    const field = isField(el);
    for (const a of Array.from(el.attributes)) if (!(a.name in v.attrs) && !Object.keys(v.attrs).some((k) => k.toLowerCase() === a.name)) el.removeAttribute(a.name);
    for (const k in v.attrs) {
      if (field && k === 'value') continue;
      if (el.getAttribute(k) !== v.attrs[k]) el.setAttribute(k, v.attrs[k]);
    }
    el._dc = el._dc || {};
    for (const k of Object.keys(el._dc)) el._dc[k] = null;
    for (const k in v.on) {
      // onChange segue a semântica do React: dispara a cada tecla em campos de texto.
      const type = k === 'onChange' && el.tagName !== 'SELECT' ? 'input' : k.slice(2).toLowerCase();
      if (!(type in el._dc)) el.addEventListener(type, (e) => { if (el._dc[type]) el._dc[type](e); });
      el._dc[type] = v.on[k];
    }
    patch(el, v.children);
    if (field && 'value' in v.attrs && el.value !== v.attrs.value) el.value = v.attrs.value;
  }

  function patch(parent, vnodes) {
    vnodes.forEach((v, i) => {
      let el = parent.childNodes[i];
      if (!el || !sameKind(el, v)) {
        const fresh = create(v);
        if (el) parent.replaceChild(fresh, el); else parent.appendChild(fresh);
        el = fresh;
      }
      if (v.text !== undefined) { if (el.nodeValue !== v.text) el.nodeValue = v.text; } else syncEl(el, v);
    });
    while (parent.childNodes.length > vnodes.length) parent.removeChild(parent.lastChild);
  }

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(partial) {
      this.state = Object.assign({}, this.state, partial);
      if (this._queued) return;
      this._queued = true;
      queueMicrotask(() => { this._queued = false; this._render(); });
    }
  }

  window.addEventListener('DOMContentLoaded', async () => {
    const source = await (await fetch(location.href)).text();
    const nodes = parse(source.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1]);
    const template = nodes;
    const script = document.querySelector('script[data-dc-script]');
    const Component = new Function('DCLogic', script.textContent + '\nreturn Component;')(DCLogic);
    document.querySelector('template[data-dc]').remove();
    const mount = document.createElement('div');
    mount.style.display = 'contents';
    document.body.appendChild(mount);
    const inst = new Component(JSON.parse(script.dataset.props || '{}'));
    inst._render = () => patch(mount, build(template, inst.renderVals()));
    inst._render();
    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('pagehide', () => { if (inst.componentWillUnmount) inst.componentWillUnmount(); });
  });
})();
