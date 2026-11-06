// Uso: node --test demo/
const test = require('node:test');
const assert = require('node:assert');
const Orb = require('../project/app.js');

const fresh = (org = 'v') => { Orb.reset(); Orb.db().org = org; return Orb.data(); };

test('menu tem as 13 abas na ordem, cada uma com tela, e marca só a ativa', () => {
  fresh();
  const { nav } = Orb.shell({ state: {} }, 'Tarefas.dc.html');
  assert.deepStrictEqual(nav.map((n) => n.label), ['Painel', 'Conversas', 'Contatos', 'Funil de vendas', 'Tarefas', 'Respostas do Cosmo', 'Instâncias WhatsApp', 'Metas e conquistas', 'Organizações', 'Equipe e permissões', 'Planos e pagamentos', 'Meu perfil', 'Suporte interno']);
  for (const n of nav) {
    assert.ok(require('fs').existsSync(require('path').join(__dirname, '..', 'project', n.href)), n.href);
    assert.ok(n.d, n.label);
  }
  assert.deepStrictEqual(nav.filter((n) => n.cls === 'nav on').map((n) => n.label), ['Tarefas']);
});

test('desmarcar e marcar a última tarefa não gera XP infinito', () => {
  const O = fresh();
  Orb.toggleTask(6); Orb.toggleTask(7); Orb.toggleTask(8);
  const full = Orb.bonus();
  assert.strictEqual(full, 15 + 10 + 20 + 30);
  for (let i = 0; i < 5; i++) { Orb.toggleTask(8); Orb.toggleTask(8); }
  assert.strictEqual(Orb.bonus(), full);
  assert.ok(O);
});

test('desmarcar tarefa que já veio concluída desconta e remarcar devolve', () => {
  fresh();
  Orb.toggleTask(1);
  assert.strictEqual(Orb.bonus(), -5);
  Orb.toggleTask(1);
  assert.strictEqual(Orb.bonus(), 0);
});

test('tarefa atrasada vale metade', () => {
  fresh();
  Orb.toggleTask(12);
  assert.strictEqual(Orb.bonus(), 3);
});

test('avanço só pontua com atividade e uma vez por etapa', () => {
  fresh();
  assert.strictEqual(Orb.moveDeal('orla', 1).xp, 0);
  Orb.logActivity('orla', 'Ligação', 'ok');
  assert.strictEqual(Orb.moveDeal('orla', 2).xp, 25);
  Orb.moveDeal('orla', 1);
  Orb.logActivity('orla', 'Ligação', 'ok');
  assert.strictEqual(Orb.moveDeal('orla', 2).xp, 0);
});

test('XP de atividades tem limite diário', () => {
  fresh();
  const got = [];
  for (let i = 0; i < 7; i++) got.push(Orb.activityXp());
  assert.deepStrictEqual(got, [10, 10, 10, 10, 10, 0, 0]);
});

test('reduzir para Starter é bloqueado com 9 assentos', () => {
  const O = fresh();
  assert.strictEqual(Orb.seatsUsed(), 9);
  const r = Orb.changePlan('starter');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(O.plan, 'pro');
  assert.match(r.blockers[0], /Remova 6/);
});

test('upgrade para Business cobra por assento usado e gera fatura', () => {
  const O = fresh();
  const before = O.invoices.length;
  assert.ok(Orb.changePlan('business').ok);
  assert.strictEqual(Orb.monthly(), 169 * 9);
  assert.strictEqual(O.invoices.length, before + 1);
});

test('Aurora respeita o limite do Starter e o papel existe na matriz', () => {
  fresh('a');
  assert.ok(Orb.seatsUsed() <= Orb.plan().limits.seats);
  assert.ok(Orb.SEED.roles.includes(Orb.role()));
  assert.strictEqual(Orb.can('users'), false);
});

test('Cosmo usa dados da organização atual', () => {
  fresh('a');
  const r = Orb.cosmo({ id: 'risco', count: false });
  assert.match(r.text, /Franquia Norte/);
  assert.doesNotMatch(r.text, /Grupo Lumen/);
});

test('vendedor sem permissão só vê os próprios negócios', () => {
  fresh('a');
  assert.ok(Orb.openDeals().every((d) => d.o === 'CA'));
});

test('Cosmo não inventa resposta e encontra contato pelo nome', () => {
  fresh();
  const none = Orb.cosmo({ text: 'qual a capital da França?', count: false });
  assert.strictEqual(none.title, 'Não achei uma resposta exata');
  assert.strictEqual(none.suggestions.length, 3);
  assert.strictEqual(Orb.cosmo({ text: 'qual o telefone da Helena?', count: false }).title, 'Helena Duarte');
});

test('SLA de 1h40 não aparece como vencendo em menos de 1 hora', () => {
  fresh();
  const r = Orb.cosmo({ id: 'sup', count: false });
  assert.match(r.text, /#4830/);
  assert.doesNotMatch(r.text, /#4827/);
});

test('números do funil batem com o que o seed prometia', () => {
  const t = (fresh(), Orb.totals());
  assert.strictEqual(t.open, 1071000);
  assert.strictEqual(t.count, 36);
  assert.strictEqual(t.risk.length, 3);
});

test('ranking e distância entre squads saem dos dados', () => {
  fresh();
  const q = Orb.squads();
  assert.strictEqual(q[0].season - q[1].season, 4510);
  assert.strictEqual(Orb.myRank(), 3);
});

test('nova tarefa entende data e hora do texto', () => {
  fresh();
  const p = Orb.parseTask('ligar para Sofia Lemos amanhã às 10h');
  assert.strictEqual(p.title, 'ligar para Sofia Lemos');
  assert.strictEqual(p.date, Orb.addDays(1));
  assert.strictEqual(p.h, '10:00');
  assert.strictEqual(Orb.parseTask('enviar proposta 14:30').h, '14:30');
  assert.strictEqual(Orb.parseTask('enviar proposta').h, '19:00');
});

test('e-mail inválido é recusado', () => {
  fresh();
  assert.strictEqual(Orb.validEmail('isso-nao-e-email'), false);
  assert.strictEqual(Orb.validEmail('a@b.com.br'), true);
  assert.ok(Orb.addContact({ name: 'X', email: 'ruim' }).errors.length);
});

test('CSV aceita ; e aspas, e informa as linhas com erro', () => {
  const O = fresh();
  const before = O.contacts.length;
  const r = Orb.importCSV('nome;email;empresa\n"Silva; Ana";ana@x.com;Acme\nSem Email;;Acme\n');
  assert.strictEqual(r.ok, 1);
  assert.strictEqual(r.fail.length, 1);
  assert.match(r.fail[0], /Linha 3/);
  assert.strictEqual(O.contacts.length, before + 1);
  assert.strictEqual(O.contacts[0].name, 'Silva; Ana');
});

test('nível sobe ao passar de 3.000 XP', () => {
  fresh();
  Orb.award('t', 700);
  const l = Orb.level();
  assert.strictEqual(l.lvl, 15);
  assert.strictEqual(l.xp, 40);
});

test('negócio ganho soma na receita e reabrir desfaz', () => {
  fresh();
  const base = Orb.totals().won;
  const xp = Orb.closeDeal('atlas', 'won');
  assert.strictEqual(xp, 62 * 3 + 50);
  assert.strictEqual(Orb.totals().won, base + 62000);
  Orb.reopenDeal('atlas');
  assert.strictEqual(Orb.totals().won, base);
  assert.strictEqual(Orb.bonus(), 0);
});

test('Cosmo guarda a pergunta por assunto e responde pela IA conectada', async () => {
  fresh();
  let ans = await Orb.askCosmo('quais negócios estão em risco?');
  assert.strictEqual(ans.topic, 'risco');
  assert.strictEqual(Orb.cosmoLog()[0].q, 'quais negócios estão em risco?');
  assert.strictEqual(Orb.setAI('anthropic', ''), 'Cole a chave de API.');
  assert.strictEqual(Orb.setAI('anthropic', 'chave-de-teste'), '');
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opt) => { sent.push({ url, body: JSON.parse(opt.body), headers: opt.headers }); return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Previsão boa.' }] }) }; };
  try {
    ans = await Orb.askCosmo('e a previsão do mês?', [{ role: 'user', text: 'oi' }, { role: 'assistant', text: 'olá' }]);
  } finally { globalThis.fetch = realFetch; Orb.clearAI(); }
  assert.strictEqual(ans.text, 'Previsão boa.');
  assert.strictEqual(ans.topic, 'prev');
  assert.strictEqual(sent[0].headers['x-api-key'], 'chave-de-teste');
  assert.deepStrictEqual(sent[0].body.messages.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.match(sent[0].body.system, /Cosmo/);
  assert.strictEqual(Orb.cosmoLog().length, 2);
});

test('Cosmo entende erros de digitação e outras formas de perguntar, e sugere perguntas do assunto', () => {
  fresh();
  const ask = (text) => Orb.cosmo({ text, count: false });
  const cases = { 'quais negocios tao em riso?': 'Negócios em risco', 'tem tarefa atrazada?': 'Tarefas atrasadas', 'qual chamado mais urgente': 'Ticket mais urgente', 'quantos vendedores tem': 'Equipe', 'quanto custa meu plano': 'Plano Pro', 'taxa de converssao': 'Conversão', 'como mudo a etapa do negocio': 'Avançar etapa', 'grupo lumen': 'Grupo Lumen' };
  for (const q in cases) assert.strictEqual(ask(q).title, cases[q], q);
  const r = ask('minhas tarefas');
  assert.ok(r.suggestions.some((x) => x.id === 'atrasadas'));
  assert.ok(!r.suggestions.some((x) => x.id === 'tarefas'));
  let total = 0;
  for (const it of Orb.cosmoIntents('')) {
    const a = Orb.cosmo({ id: it[0], count: false });
    assert.ok(a.title && a.text && Orb.TOPICS[a.topic], it[0]);
    // Cada pergunta pronta (a sugerida e as outras formas) volta para a própria resposta.
    for (const q of [it[2]].concat((Orb.COSMO_QS[it[0]] || '').split('|').filter(Boolean))) { total++; assert.strictEqual(Orb.cosmo({ text: q, count: false }).intent, it[0], q); }
  }
  assert.ok(total >= 300, total + ' perguntas prontas');
  const extra = { 'qual o maior faturamento que eu tive': 'melhorMes', 'em que mes eu mais vendi': 'melhorMes', 'quem ta sem 2fa': 'tfa', 'tenho reuniao amanha': 'amanha', 'valeu cosmo': 'obrigado' };
  for (const q in extra) assert.strictEqual(ask(q).intent, extra[q], q);
});
