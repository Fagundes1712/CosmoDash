// Regras, persistência e menu lateral compartilhados por todas as telas.
// shortcut: localStorage guarda tudo neste navegador; trocar por API e banco ao virar SaaS.
(function () {
  const g = typeof window !== 'undefined' ? window : globalThis;
  const SEED = typeof module !== 'undefined' ? require('./data.js') : g.ORB_SEED;
  const KEY = 'cosmodash:v1';
  const DAY = 86400000;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (dt) => dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const unaccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const TIERS = [['Operador', 1, 5, 'Painel pessoal e missões diárias', 'var(--label-2)'], ['Especialista', 6, 10, 'Desafios semanais e mentoria', 'var(--accent-text)'], ['Estrategista', 11, 15, 'Acesso antecipado a leads inbound', 'var(--pink)'], ['Elite', 16, 20, 'Destaque mensal na organização', 'var(--accent)'], ['Vanguarda', 21, 25, 'Participa da definição de metas', 'var(--orange)'], ['Cosmos', 26, 30, 'Recompensa definida pela empresa', 'var(--label-2)']];
  const XP_PER_LEVEL = 3000;
  const ACTIVITY_CAP = 5;

  function seedOrg(o) {
    const c = clone(o);
    const now = Date.now();
    c.perms = c.perms || clone(SEED.perms);
    c.xpLog = {}; c.audit = []; c.counters = {}; c.joined = {}; c.claimed = {};
    c.tasks.forEach((t) => { t.date = iso(new Date(now + t.off * DAY)); });
    c.tickets.forEach((t) => { t.due = now + t.slaMin * 60000; t.status = 'open'; });
    c.feed.forEach((f) => { f.ts = now - f.ago * 60000; });
    c.contacts.forEach((k) => {
      const first = unaccent(k.name.replace('Dra. ', '').split(' ')[0].toLowerCase());
      k.email = first + '@' + unaccent(k.co.toLowerCase()).replace(/[^a-z]/g, '') + '.com.br';
      k.phone = '+55 11 9' + (8000 + k.p * 17) + '-' + (1000 + k.p * 31);
    });
    return c;
  }

  function fresh() {
    const orgs = {};
    for (const id in SEED.orgs) orgs[id] = seedOrg(SEED.orgs[id]);
    return { org: 'v', collapsed: false, profile: clone(SEED.profile), orgs, toast: null };
  }

  function load() {
    try { const raw = g.localStorage && g.localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* dado corrompido ou bloqueado: recomeça do seed */ }
    return fresh();
  }

  let db = load();
  const O = () => db.orgs[db.org];

  const Orb = {
    SEED, TIERS,
    save() { try { if (g.localStorage) g.localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; } },
    reset() { db = fresh(); try { if (g.localStorage) g.localStorage.removeItem(KEY); } catch (e) { /* sem armazenamento: só memória */ } },
    db: () => db, data: O, orgId: () => db.org, profile: () => db.profile,

    brl: (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR'),
    brl2: (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    mil: (v) => (v >= 1000000 ? 'R$ ' + (v / 1000000).toFixed(2).replace('.', ',') + ' mi' : 'R$ ' + Math.round(v / 1000) + ' mil'),
    num: (v) => v.toLocaleString('pt-BR'),
    pl: (n, one, many) => n + ' ' + (n === 1 ? one : many),
    today: () => iso(new Date()),
    addDays: (n) => iso(new Date(Date.now() + n * DAY)),
    clock: () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    ini: (name) => (name || '').replace(/^Dra?\.\s*/, '').trim().split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase(),
    validEmail: (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim()),
    param: (k) => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get(k) : null),
    dayLabel(dateStr) { const d = new Date(dateStr + 'T12:00:00'); return WEEK[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); },
    headerDate() { const d = new Date(); return WEEK[d.getDay()] + ' · ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); },
    greeting() { const h = new Date().getHours(); return (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + db.profile.name.trim().split(/\s+/)[0]; },
    monthName: (offset = 0) => { const d = new Date(); return MONTHS[(d.getMonth() + offset + 12) % 12]; },
    daysLeftInMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); },
    daysLeftInSeason() { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return Math.ceil((new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59) - d) / DAY); },
    seasonName() { return 'Q' + (Math.floor(new Date().getMonth() / 3) + 1); },
    ago(ts) { const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); if (m < 1) return 'agora'; if (m < 60) return 'há ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'há ' + h + ' h'; return 'há ' + Math.round(h / 24) + ' d'; },
    months() { const d = new Date(); const out = []; for (let i = 5; i >= 0; i--) { const n = MONTHS[(d.getMonth() - i + 12) % 12]; out.push(n[0].toUpperCase() + n.slice(1, 3)); } return out; },

    // Permissões e plano
    role: () => O().role,
    can(perm) { const row = O().perms[perm]; return !!row && !!row[SEED.roles.indexOf(O().role)]; },
    plan: (id) => SEED.plans[id || O().plan],
    isBusiness: () => O().plan === 'business',
    seatsUsed: () => O().people.length + (O().hidMembers || 0) + O().invites.length,
    contactsCount: () => O().contacts.length + (O().contactsBase || 0),
    seatsBilled(planId) { const id = planId || O().plan; const lim = SEED.plans[id].limits.seats; return lim || Orb.seatsUsed(); },
    monthly(planId, cycle) { const p = SEED.plans[planId || O().plan]; return p.p * Orb.seatsBilled(planId) * ((cycle || O().cycle) === 'a' ? 0.8 : 1); },
    nextCharge() { const d = new Date(); const next = d.getDate() < 5 ? new Date(d.getFullYear(), d.getMonth(), 5) : new Date(d.getFullYear(), d.getMonth() + 1, 5); return next; },
    daysToCharge() { return Math.max(1, Math.ceil((Orb.nextCharge() - Date.now()) / DAY)); },
    planBlockers(planId) {
      const lim = SEED.plans[planId].limits;
      const out = [];
      if (lim.seats !== null && Orb.seatsUsed() > lim.seats) out.push('Remova ' + Orb.pl(Orb.seatsUsed() - lim.seats, 'pessoa ou convite', 'pessoas ou convites') + ' (limite de ' + lim.seats + ' usuários).');
      if (lim.contacts !== null && Orb.contactsCount() > lim.contacts) out.push('Remova ' + Orb.num(Orb.contactsCount() - lim.contacts) + ' contatos (limite de ' + Orb.num(lim.contacts) + ').');
      if (lim.storage < O().usage.storage) out.push('Libere ' + (O().usage.storage - lim.storage).toFixed(1).replace('.', ',') + ' GB de armazenamento.');
      return out;
    },
    changePlan(planId) {
      const blockers = Orb.planBlockers(planId);
      if (blockers.length) return { ok: false, blockers };
      const from = SEED.plans[O().plan];
      const diff = Orb.monthly(planId) - Orb.monthly();
      const up = SEED.plans[planId].rank > from.rank;
      if (up && diff > 0) O().invoices.unshift(['Ajuste', from.n + ' → ' + SEED.plans[planId].n + ' · proporcional', Math.round(diff * Orb.daysToCharge() / 30 * 100) / 100, new Date().toLocaleDateString('pt-BR')]);
      O().plan = planId;
      Orb.audit('Plano alterado de ' + from.n + ' para ' + SEED.plans[planId].n);
      Orb.save();
      return { ok: true };
    },
    audit(text) { O().audit.unshift({ text, who: db.profile.name, ts: Date.now() }); },

    // XP: cada ganho tem id próprio, então repetir uma ação não soma de novo.
    award(id, amount) { O().xpLog[id] = amount; },
    revoke(id) { delete O().xpLog[id]; },
    bonus() { return Object.values(O().xpLog).reduce((a, b) => a + b, 0); },
    level() {
      let xp = Math.max(0, O().me.xp + Orb.bonus());
      let lvl = O().me.lvl;
      while (xp >= XP_PER_LEVEL) { xp -= XP_PER_LEVEL; lvl++; }
      const tier = TIERS.find((t) => lvl <= t[2]) || TIERS[5];
      const next = TIERS.find((t) => t[1] > lvl);
      return { lvl, xp, max: XP_PER_LEVEL, left: XP_PER_LEVEL - xp, pct: xp / XP_PER_LEVEL * 100, tier: tier[0], tierIdx: TIERS.indexOf(tier), color: tier[4], nextTier: next ? next[0] : '', nextTierLvl: next ? next[1] : 0 };
    },
    season: () => O().me.season + Orb.bonus(),
    winXp: (v) => Math.round(v / 1000) * 3 + 50,
    count(key, by = 1) { const k = key + ':' + Orb.today(); O().counters[k] = (O().counters[k] || 0) + by; return O().counters[k]; },
    counted: (key) => O().counters[key + ':' + Orb.today()] || 0,
    activityXp(xp = 10) { const n = Orb.count('activity'); if (n > ACTIVITY_CAP) return 0; Orb.award('act-' + Orb.today() + '-' + n, xp); return xp; },

    person(i) { if (i === 'CA') return { n: db.profile.name, c: SEED.colors.CA }; const p = O().people.find((x) => x.i === i); return p ? { n: p.n, c: p.c } : { n: i, c: 'var(--accent)' }; },
    feed(item) { O().feed.unshift(Object.assign({ ts: Date.now(), xp: 0 }, item)); },
    ranking() {
      const list = O().people.map((p) => ({ name: Orb.person(p.i).n, ini: p.i === 'CA' ? Orb.ini(db.profile.name) : p.i, color: p.c, sub: (p.i === 'CA' ? 'Você · ' : p.role + ' · ') + p.sq, season: p.i === 'CA' ? Orb.season() : p.season, me: p.i === 'CA' }));
      return list.sort((a, b) => b.season - a.season);
    },
    squads() {
      const list = O().squads.map((name) => { const ms = O().people.filter((p) => p.sq === name); return { name, ini: Orb.ini(name), members: ms.map((m) => Orb.person(m.i).n.split(' ')[0]).join(', '), season: ms.reduce((a, m) => a + (m.i === 'CA' ? Orb.season() : m.season), 0), me: ms.some((m) => m.i === 'CA') }; });
      return list.sort((a, b) => b.season - a.season);
    },
    myRank: () => Orb.ranking().findIndex((r) => r.me) + 1,

    // Funil
    dealVisible: (d) => Orb.can('all') || d.o === 'CA',
    dealEditable: (d) => Orb.can('edit') || d.o === 'CA',
    openDeals: () => O().deals.filter((d) => d.status === 'open' && Orb.dealVisible(d)),
    funnelStats(fid) {
      const hid = (Orb.can('all') && O().hid[fid]) || [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
      return SEED.stages.map((name, i) => {
        const all = Orb.openDeals().filter((d) => (d.f || 'b2b') === fid && d.st === i);
        const sum = all.reduce((a, d) => a + d.v, 0) + hid[i][1];
        return { name, i, prob: SEED.probs[i], deals: all, count: all.length + hid[i][0], sum, more: hid[i][0] };
      });
    },
    totals() {
      let open = 0, count = 0, weighted = 0;
      O().funnels.forEach((f) => Orb.funnelStats(f.id).forEach((s) => { open += s.sum; count += s.count; weighted += s.sum * s.prob; }));
      const risk = Orb.openDeals().filter((d) => d.d >= 10);
      const wins = O().deals.filter((d) => d.status === 'won');
      const won = O().k.wonBase + wins.reduce((a, d) => a + d.v, 0);
      return { open, count, weighted, risk, won, wonCount: O().k.wonCount + wins.length };
    },
    moveDeal(id, st) {
      const d = O().deals.find((x) => x.id === id);
      if (!d || d.st === st || st < 0 || st >= SEED.stages.length) return { xp: 0, msg: '' };
      if (!Orb.dealEditable(d)) return { xp: 0, msg: 'Você não tem permissão para mover este negócio' };
      const forward = st > d.st;
      d.st = st; d.d = 0;
      d.log.unshift({ t: 'Etapa alterada para ' + SEED.stages[st] + ' por ' + db.profile.name, ts: Date.now() });
      let xp = 0;
      // Regra de Metas: avanço só pontua com atividade registrada, e cada etapa pontua uma vez.
      if (forward && d.act && !O().xpLog['adv-' + id + '-' + st]) { xp = 25; Orb.award('adv-' + id + '-' + st, xp); Orb.count('advance'); }
      d.act = false;
      Orb.feed({ ini: 'CA', who: 'Você', what: 'moveu ' + d.co + ' para ' + SEED.stages[st], xp });
      Orb.save();
      return { xp, msg: d.co + ' → ' + SEED.stages[st] + (xp ? ' · +' + xp + ' XP' : forward ? ' · sem XP: registre uma atividade antes de avançar' : '') };
    },
    logActivity(id, type, note) {
      const d = O().deals.find((x) => x.id === id);
      d.d = 0; d.act = true;
      d.log.unshift({ t: type + ': ' + note, ts: Date.now() });
      const xp = Orb.activityXp();
      Orb.save();
      return xp;
    },
    closeDeal(id, status, reason) {
      const d = O().deals.find((x) => x.id === id);
      d.status = status; d.closedAt = Date.now(); d.reason = reason || '';
      let xp = 0;
      if (status === 'won') { xp = Orb.winXp(d.v); Orb.award('win-' + id, xp); Orb.feed({ ini: 'CA', who: 'Você', what: 'ganhou ' + d.co + ' · ' + Orb.brl(d.v), xp }); }
      else Orb.feed({ ini: 'CA', who: 'Você', what: 'marcou ' + d.co + ' como perdido', xp: 0 });
      d.log.unshift({ t: (status === 'won' ? 'Marcado como ganho' : 'Marcado como perdido: ' + reason), ts: Date.now() });
      Orb.save();
      return xp;
    },
    reopenDeal(id) {
      const d = O().deals.find((x) => x.id === id);
      d.status = 'open'; d.d = 0; d.reason = ''; Orb.revoke('win-' + id);
      d.log.unshift({ t: 'Negócio reaberto', ts: Date.now() });
      Orb.save();
    },

    // Tarefas
    tasksToday: () => O().tasks.filter((t) => t.date === Orb.today()),
    tasksPending: () => Orb.tasksToday().filter((t) => !t.done).length,
    tasksLate: () => O().tasks.filter((t) => t.date < Orb.today() && !t.done),
    toggleTask(id) {
      const t = O().tasks.find((x) => x.id === id);
      const late = t.date < Orb.today();
      t.done = !t.done;
      const key = 'task-' + id;
      Orb.revoke(key);
      // Tarefa que já veio concluída não recebe XP de novo; desmarcá-la devolve o que valia.
      if (t.seedDone && !t.done) Orb.award(key, -t.xp);
      if (!t.seedDone && t.done) Orb.award(key, late ? Math.round(t.xp / 2) : t.xp);
      const dayKey = 'day-' + Orb.today();
      const today = Orb.tasksToday();
      const allDone = today.length > 0 && today.every((x) => x.done);
      const hadBonus = dayKey in O().xpLog;
      if (allDone) Orb.award(dayKey, 30); else Orb.revoke(dayKey);
      Orb.save();
      return { done: t.done, xp: O().xpLog[key] || 0, dayBonus: allDone && !hadBonus, late };
    },
    parseTask(text) {
      let t = ' ' + text.trim() + ' ';
      let date = Orb.today(), h = null;
      const low = () => unaccent(t.toLowerCase());
      const cut = (re) => { const m = low().match(re); if (!m) return null; t = t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length); return m; };
      if (cut(/\sdepois de amanha\b/)) date = Orb.addDays(2);
      else if (cut(/\samanha\b/)) date = Orb.addDays(1);
      else if (cut(/\shoje\b/)) date = Orb.today();
      else {
        const names = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const m = cut(new RegExp('\\s(?:na |no )?(' + names.join('|') + ')(?:-feira)?\\b'));
        if (m) { const delta = (names.indexOf(m[1]) - new Date().getDay() + 7) % 7 || 7; date = Orb.addDays(delta); }
      }
      const tm = cut(/\s(?:as |às )?(\d{1,2})(?:h|:)(\d{2})?(?:h)?(?=\s)/);
      if (tm && Number(tm[1]) < 24) h = pad(Number(tm[1])) + ':' + (tm[2] || '00');
      return { title: t.replace(/\s+/g, ' ').trim(), date, h: h || '19:00' };
    },

    // Suporte
    slaInfo(t) {
      if (t.status === 'resolved') return { txt: t.inSla ? 'Cumprido' : 'Fora do SLA', c: t.inSla ? 'var(--accent-text)' : 'var(--orange)', w: '100%', min: 0 };
      const min = Math.round((t.due - Date.now()) / 60000);
      if (min <= 0) return { txt: 'Vencido', c: 'var(--orange)', w: '100%', min };
      const txt = min < 60 ? min + ' min' : Math.floor(min / 60) + 'h' + (min % 60 ? ' ' + pad(min % 60) + 'min' : '');
      return { txt, c: min < 60 ? 'var(--orange)' : min < 240 ? 'var(--label-2)' : 'var(--accent-text)', w: Math.max(4, Math.min(100, Math.round((1 - min / t.tot) * 100))) + '%', min };
    },
    ticketsOpen: () => O().tickets.filter((t) => t.status === 'open').length + Object.values(O().hidTickets).reduce((a, b) => a + b, 0),
    resolveTicket(id) {
      const t = O().tickets.find((x) => x.id === id);
      t.inSla = Orb.slaInfo(t).min > 0;
      t.status = 'resolved';
      // Regra de Metas: ticket fora do SLA não pontua.
      if (t.inSla) Orb.award('tk-' + id, 20);
      Orb.feed({ ini: 'CA', who: 'Você', what: 'resolveu o ticket ' + id + (t.inSla ? ' dentro do SLA' : ' fora do SLA'), xp: t.inSla ? 20 : 0 });
      Orb.save();
      return t.inSla;
    },
    reopenTicket(id) { const t = O().tickets.find((x) => x.id === id); t.status = 'open'; Orb.revoke('tk-' + id); Orb.save(); },

    // Contatos
    addContact(f) {
      const errors = [];
      if (!(f.name || '').trim()) errors.push('Informe o nome.');
      if (!Orb.validEmail(f.email)) errors.push('Informe um e-mail válido.');
      if (O().contacts.some((c) => c.email.toLowerCase() === (f.email || '').trim().toLowerCase())) errors.push('Já existe um contato com este e-mail.');
      const lim = Orb.plan().limits.contacts;
      if (lim !== null && Orb.contactsCount() >= lim) errors.push('Limite de ' + Orb.num(lim) + ' contatos do plano atingido.');
      if (errors.length) return { errors };
      const c = { id: 'c' + Date.now() + Math.floor(Math.random() * 1000), name: f.name.trim(), role: (f.role || '').trim() || '—', co: (f.co || '').trim() || 'Sem empresa', days: 0, p: 60, o: 'CA', tags: [f.tag || 'Manual'], tip: 'Contato novo. Registre a primeira interação para o pulso começar a contar.', stage: '', seed: false, email: f.email.trim(), phone: (f.phone || '').trim(), tl: [] };
      O().contacts.unshift(c);
      Orb.save();
      return { contact: c, errors: [] };
    },
    parseCSV(text) {
      const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
      if (!lines.length) return [];
      const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
      const split = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
      const head = split(lines[0]).map((h) => unaccent(h.toLowerCase()));
      const col = (...names) => head.findIndex((h) => names.includes(h));
      const ix = { name: col('nome', 'name'), email: col('e-mail', 'email'), phone: col('telefone', 'phone', 'whatsapp'), co: col('empresa', 'company'), role: col('cargo', 'role') };
      return lines.slice(1).map((l) => { const c = split(l); const get = (k) => (ix[k] >= 0 ? c[ix[k]] || '' : ''); return { name: get('name'), email: get('email'), phone: get('phone'), co: get('co'), role: get('role'), tag: 'Importado' }; });
    },
    importCSV(text) {
      let ok = 0; const fail = [];
      Orb.parseCSV(text).forEach((row, i) => { const r = Orb.addContact(row); if (r.errors.length) fail.push('Linha ' + (i + 2) + ': ' + r.errors[0]); else ok++; });
      return { ok, fail };
    },

    // Cosmo: respostas por regras sobre os dados da organização. Cada intenção tem palavras-chave (radicais);
    // a busca tolera acentos, plurais e erros de digitação e sempre devolve sugestões de perguntas parecidas.
    cosmoIntents() {
      const s = Orb.totals(), o = O(), k = o.k;
      const list = (ds) => ds.map((d) => d.co + ' (' + Orb.mil(d.v) + ', ' + SEED.stages[d.st] + ', ' + d.d + ' dias)').join(', ');
      const open = Orb.openDeals();
      const byValue = open.slice().sort((a, b) => b.v - a.v);
      const tasksToday = Orb.tasksToday();
      const pendingToday = tasksToday.filter((t) => !t.done).sort((a, b) => a.h.localeCompare(b.h));
      const late = Orb.tasksLate();
      const openTickets = o.tickets.filter((x) => x.status === 'open').sort((a, b) => Orb.slaInfo(a).min - Orb.slaInfo(b).min);
      const lv = Orb.level();
      const plan = Orb.plan();
      const lim = plan.limits;
      const lim$ = (v, unit) => (v === null ? 'ilimitado' : Orb.num(v) + (unit || ''));
      const unread = o.notifications.filter((n) => n.unread);
      const won = o.deals.filter((d) => d.status === 'won'), lost = o.deals.filter((d) => d.status === 'lost');
      const nextTask = pendingToday.find((t) => t.h >= Orb.clock()) || pendingToday[0];
      const role = o.role, myPerms = SEED.permissions.filter((p) => Orb.can(p[0])).map((p) => p[1].toLowerCase());
      const prevAns = () => {
        const missing = k.goal - s.won;
        const closing = open.filter((d) => d.st === 4).sort((a, b) => b.v - a.v);
        const left = Orb.daysLeftInMonth();
        const when = left === 0 ? 'O mês fecha hoje' : 'Faltam ' + left + ' dias para fechar o mês';
        const res = { title: 'Fechamento de ' + Orb.monthName(), href: 'Pipeline.dc.html', cta: 'Priorizar no funil' };
        if (missing <= 0) return Object.assign(res, { text: 'Meta batida: ' + Orb.brl(s.won) + ' de ' + Orb.brl(k.goal) + '.' });
        let acc = 0; const need = [];
        for (const d of closing) { if (acc >= missing) break; acc += d.v; need.push(d.co); }
        const tail = acc >= missing ? ' Fechar ' + need.join(' e ') + ' já bate a meta.' : ' Mesmo fechando todos, a meta não é atingida.';
        return Object.assign(res, { text: when + ' e faltam ' + Orb.brl(missing) + ' para a meta. Em Fechamento há ' + Orb.pl(closing.length, 'negócio', 'negócios') + ' somando ' + Orb.mil(closing.reduce((a, d) => a + d.v, 0)) + '.' + tail + ' Receita ponderada do funil: ' + Orb.mil(s.weighted) + '.' });
      };
      // [id, assunto, pergunta sugerida, palavras-chave, resposta]
      return [
        ['risco', 'risco', 'Quais negócios estão em risco?', 'risco perigo parad esfri estagn esquec interac follow negocio', () => {
          const sum = s.risk.reduce((a, d) => a + d.v, 0);
          return s.risk.length ? { title: 'Negócios em risco', text: (s.risk.length === 1 ? '1 negócio está' : s.risk.length + ' negócios estão') + ' sem interação há 10 dias ou mais e ' + (s.risk.length === 1 ? 'soma ' : 'somam ') + Orb.mil(sum) + ': ' + list(s.risk) + '. Sugiro um follow-up hoje.', href: 'Pipeline.dc.html?filter=risk', cta: 'Abrir funil' } : { title: 'Negócios em risco', text: 'Nenhum negócio parado há 10 dias ou mais.', href: 'Pipeline.dc.html', cta: 'Abrir funil' };
        }],
        ['prev', 'prev', 'Qual a previsão do mês?', 'previs meta fechament mes falta bater projec forecast estimat', prevAns],
        ['semana', 'semana', 'Como foi minha semana?', 'seman resumo balanc retrospect', () => {
          const wins = won.filter((d) => Date.now() - d.closedAt < 7 * DAY);
          return { title: 'Resumo da semana', text: Orb.pl(k.weekWon + wins.length, 'negócio ganho', 'negócios ganhos') + ' (' + Orb.mil(k.weekVal + wins.reduce((a, d) => a + d.v, 0)) + '), ' + (k.weekActs + Orb.counted('activity')) + ' atividades registradas e 1ª resposta média a leads de ' + k.leadReply + '. Você está em ' + Orb.myRank() + 'º no ranking.', href: 'Metas.dc.html', cta: 'Ver metas' };
        }],
        ['receita', 'vendas', 'Quanto vendemos este mês?', 'receit fatur vendi vendemos vendas ganh dinheiro entrou resultado', () => ({ title: 'Receita de ' + Orb.monthName(), text: Orb.brl(s.won) + ' em ' + Orb.pl(s.wonCount, 'negócio ganho', 'negócios ganhos') + ', ' + Math.round(s.won / k.goal * 100) + '% da meta de ' + Orb.brl(k.goal) + (k.delta ? '. Variação contra o mês anterior: ' + k.delta : '') + '. Ticket médio: ' + (s.wonCount ? Orb.brl(s.won / s.wonCount) : '—') + '.', href: 'Main.dc.html', cta: 'Ver painel' })],
        ['maior', 'vendas', 'Quais são os maiores negócios?', 'maior maiores top grande principa valios priorid negocio', () => ({ title: 'Maiores negócios abertos', text: byValue.length ? list(byValue.slice(0, 5)) + '.' : 'Nenhum negócio aberto.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['pipeline', 'vendas', 'Quanto tenho no pipeline?', 'pipeline funil abert aberto carteira oportunidad ponderad', () => {
          const st = SEED.stages.map((n, i) => n + ' ' + open.filter((d) => d.st === i).length).join(', ');
          return { title: 'Pipeline aberto', text: Orb.mil(s.open) + ' em ' + Orb.pl(s.count, 'negócio aberto', 'negócios abertos') + ' (ponderado pela probabilidade: ' + Orb.mil(s.weighted) + '). Por etapa: ' + st + '.', href: 'Pipeline.dc.html', cta: 'Abrir funil' };
        }],
        ['closing', 'vendas', 'Quais negócios estão para fechar?', 'quase prest perto fechar negociac proposta assinar negocio', () => {
          const near = open.filter((d) => d.st >= 3).sort((a, b) => b.st - a.st || b.v - a.v);
          return { title: 'Perto de fechar', text: near.length ? Orb.pl(near.length, 'negócio', 'negócios') + ' em Negociação ou Fechamento: ' + list(near) + '.' : 'Nenhum negócio em Negociação ou Fechamento.', href: 'Pipeline.dc.html', cta: 'Abrir funil' };
        }],
        ['conv', 'vendas', 'Qual a taxa de conversão?', 'convers taxa ciclo ticket medio desempenh performanc eficien', () => ({ title: 'Conversão', text: 'Taxa de conversão de ' + k.conv + ' (' + k.convDelta + '), ciclo médio de ' + k.cycleDays + ' dias e ticket médio de ' + (s.wonCount ? Orb.brl(s.won / s.wonCount) : '—') + '. 1ª resposta média a leads: ' + k.leadReply + '.', href: 'Main.dc.html', cta: 'Ver painel' })],
        ['ganhos', 'vendas', 'Quais negócios ganhei ou perdi?', 'ganhei perdi perdid ganhos fechei vitori derrot motivo perda negocio', () => ({ title: 'Ganhos e perdas', text: (won.length ? 'Ganhos recentes: ' + won.map((d) => d.co + ' (' + Orb.mil(d.v) + ')').join(', ') + '. ' : 'Nenhum negócio marcado como ganho no CosmoDash ainda. ') + (lost.length ? 'Perdidos: ' + lost.map((d) => d.co + (d.reason ? ' (' + d.reason + ')' : '')).join(', ') + '.' : 'Nenhum perdido.') + ' No mês, ' + Orb.pl(s.wonCount, 'negócio ganho', 'negócios ganhos') + ' no total.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['novoNeg', 'ajuda', 'Como crio um negócio?', 'criar cri novo nova cadastr adicion negocio oportunidad deal', () => ({ title: 'Criar negócio', text: 'No Funil de vendas, clique em "Novo negócio", informe empresa, valor, etapa e contato. Criar um negócio vale 10 XP.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['mover', 'ajuda', 'Como avanço um negócio de etapa?', 'avanc mover mov muda etapa estagio arrast pular negocio', () => ({ title: 'Avançar etapa', text: 'Abra o negócio no Funil, registre uma atividade e use "Avançar para". O avanço só vale XP com uma atividade registrada antes, e cada etapa pontua uma vez.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['tarefas', 'tarefas', 'Quais são minhas tarefas de hoje?', 'tarefa agenda hoje compromiss afazer pendent lista', () => ({ title: 'Tarefas de hoje', text: tasksToday.length ? Orb.pl(tasksToday.filter((t) => t.done).length, 'concluída', 'concluídas') + ' de ' + tasksToday.length + '. ' + (pendingToday.length ? 'Pendentes: ' + pendingToday.map((t) => t.h + ' ' + t.t).join('; ') + '.' : 'Tudo feito hoje.') : 'Nenhuma tarefa para hoje.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' })],
        ['atrasadas', 'tarefas', 'Tenho tarefas atrasadas?', 'atrasad vencid esqueci ontem passad acumulad tarefa', () => ({ title: 'Tarefas atrasadas', text: late.length ? Orb.pl(late.length, 'tarefa atrasada', 'tarefas atrasadas') + ': ' + late.map((t) => t.t + ' (' + Orb.dayLabel(t.date) + ')').join('; ') + '. Concluída com atraso, vale metade do XP.' : 'Nenhuma tarefa atrasada.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' })],
        ['proxima', 'tarefas', 'Qual meu próximo compromisso?', 'proxim reuniao ligac depois seguinte agora horario', () => ({ title: 'Próximo compromisso', text: nextTask ? nextTask.h + ' · ' + nextTask.t + (nextTask.ctx ? ' (' + nextTask.ctx + ')' : '') + '.' : 'Nada pendente para hoje.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' })],
        ['novaTarefa', 'ajuda', 'Como crio uma tarefa?', 'criar cri nova novo adicion marcar agendar lembrete tarefa', () => ({ title: 'Criar tarefa', text: 'Em Tarefas, escreva em linguagem natural, como "ligar para Sofia amanhã às 10h". O CosmoDash entende o dia e o horário.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' })],
        ['urgente', 'sup', 'Qual ticket é mais urgente?', 'urgent priorid primeiro critic grave vencend', () => {
          const t = openTickets[0];
          return { title: 'Ticket mais urgente', text: t ? t.id + ' · ' + t.title + ', de ' + t.from + ' (' + t.org.split(' · ')[0] + '). Prioridade ' + t.prio + ', SLA: ' + Orb.slaInfo(t).txt + '.' : 'Nenhum ticket aberto.', href: 'Suporte.dc.html', cta: 'Abrir fila' };
        }],
        ['sup', 'sup', 'Como está o suporte?', 'suporte ticket chamado atendiment fila reclama problema cliente', () => {
          const urgent = openTickets.filter((x) => Orb.slaInfo(x).min < 60);
          return { title: 'Suporte', text: Orb.pl(Orb.ticketsOpen(), 'ticket aberto', 'tickets abertos') + (urgent.length ? ', ' + urgent.length + ' com SLA vencendo em menos de 1 hora (' + urgent.map((x) => x.id + ' de ' + x.org.split(' · ')[0]).join(', ') + ').' : ', nenhum com SLA vencendo em menos de 1 hora.'), href: 'Suporte.dc.html', cta: 'Abrir fila' };
        }],
        ['sla', 'sup', 'Como está o SLA e a satisfação?', 'sla csat satisfac nps nota qualidade tempo resposta', () => ({ title: 'SLA e satisfação', text: 'SLA cumprido em ' + k.sla + ', CSAT ' + k.csat + ' e 1ª resposta média de ' + k.first + '.', href: 'Suporte.dc.html', cta: 'Abrir fila' })],
        ['nivel', 'metas', 'Qual é o meu nível?', 'nivel xp ponto experienc tier categori subir evolu', () => ({ title: 'Seu nível', text: 'Nível ' + lv.lvl + ' (' + lv.tier + '), com ' + Orb.num(lv.xp) + ' de ' + Orb.num(lv.max) + ' XP. Faltam ' + Orb.num(lv.left) + ' XP para o nível ' + (lv.lvl + 1) + (lv.nextTier ? '; ' + lv.nextTier + ' começa no nível ' + lv.nextTierLvl : '') + '.', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['ranking', 'metas', 'Qual minha posição no ranking?', 'ranking posic coloca lider primeiro competic disput temporad classific', () => {
          const r = Orb.ranking();
          return { title: 'Ranking · ' + Orb.seasonName(), text: 'Você está em ' + Orb.myRank() + 'º de ' + r.length + ' com ' + Orb.num(Orb.season()) + ' XP na temporada. Lidera ' + r[0].name + ' (' + Orb.num(r[0].season) + ' XP). A temporada acaba em ' + Orb.daysLeftInSeason() + ' dias.', href: 'Metas.dc.html', cta: 'Ver ranking' };
        }],
        ['missoes', 'metas', 'Quais são as missões de hoje?', 'missao missoe desafio diari objetivo', () => {
          const m = [['Avançar 2 negócios de etapa', Orb.counted('advance'), 2], ['Registrar 5 atividades', Orb.counted('activity'), 5], ['Concluir 3 tarefas de hoje', tasksToday.filter((t) => t.done).length, 3]];
          return { title: 'Missões de hoje', text: m.map((x) => x[0] + ': ' + Math.min(x[1], x[2]) + '/' + x[2]).join('; ') + '. Renovam à meia-noite.', href: 'Main.dc.html', cta: 'Ver painel' };
        }],
        ['squad', 'metas', 'Como está meu squad?', 'squad time coletiv grupo', () => ({ title: o.me.squad, text: 'Nível ' + o.squad.lvl + ', ' + o.squad.wins + ' de ' + o.squad.winsGoal + ' vitórias e ' + Orb.mil(o.squad.won) + ' de ' + Orb.mil(o.squad.goalWon) + ' na meta do squad. Resposta média ' + o.squad.resp + ' (meta ' + o.squad.respGoal + ').', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['streak', 'metas', 'Quantos dias seguidos eu tenho?', 'sequenc seguid streak ofensiv fogo dias', () => ({ title: 'Sequência', text: o.me.streak + ' dias seguidos batendo as missões. Não deixe zerar hoje.', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['xpRegras', 'ajuda', 'Como ganho XP?', 'ganhar ganho pontu regra xp vale', () => ({ title: 'Como ganhar XP', text: 'Criar negócio vale 10 XP; avançar etapa com atividade, 25; ganhar, 50 mais 3 por mil reais; resolver ticket no SLA, 20; tarefas valem o indicado e, atrasadas, metade. Atividades pontuam até 5 por dia.', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['contatos', 'contato', 'Quais contatos estão sem retorno?', 'contato client lead pessoa esquecid sumid retorn ligar relacion', () => {
          const cold = o.contacts.slice().sort((a, b) => b.days - a.days).slice(0, 5);
          return { title: 'Contatos sem retorno', text: Orb.pl(Orb.contactsCount(), 'contato', 'contatos') + ' na base. Há mais tempo sem contato: ' + cold.map((c) => c.name + ' (' + c.co + ', ' + c.days + ' dias)').join(', ') + '.', href: 'Contatos.dc.html', cta: 'Abrir contatos' };
        }],
        ['novoContato', 'ajuda', 'Como cadastro ou importo contatos?', 'cadastr import csv planilh excel novo adicion contato export', () => ({ title: 'Cadastrar contatos', text: 'Em Contatos, use "Novo contato" para um por vez ou "Importar CSV" para uma planilha com nome, e-mail, telefone, empresa e cargo. "Exportar CSV" baixa a base.', href: 'Contatos.dc.html', cta: 'Abrir contatos' })],
        ['convidar', 'ajuda', 'Como convido alguém?', 'convid chamar adicion incluir novo usuario acesso', () => ({ title: 'Convidar pessoa', text: Orb.can('users') ? 'Em Equipe e permissões, clique em "Convidar", informe os e-mails, o papel e o squad.' : 'Seu papel (' + role + ') não pode convidar. Peça a um Admin.', href: 'Equipe.dc.html', cta: 'Abrir equipe' })],
        ['equipe', 'equipe', 'Quem está na equipe?', 'equipe membro usuari pessoa vendedor vendedores colabor convit assento', () => ({ title: 'Equipe', text: Orb.pl(Orb.orgMembers(o), 'pessoa', 'pessoas') + ' em ' + o.squads.length + ' squads (' + o.squads.join(', ') + ')' + (o.invites.length ? ' e ' + Orb.pl(o.invites.length, 'convite pendente', 'convites pendentes') : '') + '. Assentos usados: ' + Orb.seatsUsed() + ' de ' + lim$(lim.seats) + '.', href: 'Equipe.dc.html', cta: 'Abrir equipe' })],
        ['perm', 'equipe', 'O que meu papel pode fazer?', 'permiss papel acesso pode posso admin gestor bloque', () => ({ title: 'Seu papel: ' + role, text: myPerms.length ? 'Você pode: ' + myPerms.join(', ') + '.' : 'Seu papel não tem permissões extras.', href: 'Equipe.dc.html?tab=p', cta: 'Ver permissões' })],
        ['org', 'equipe', 'Quais são minhas organizações?', 'organiz empresa conta workspac trocar mudar', () => ({ title: 'Organizações', text: 'Você está em ' + o.name + '. Suas organizações: ' + Object.values(db.orgs).map((x) => x.name + ' (' + x.role + ')').join(', ') + '. Troque pelo menu no topo.', href: 'Organizacoes.dc.html', cta: 'Ver organizações' })],
        ['plano', 'plano', 'Qual é o meu plano?', 'plano assinatur pago pagar preco custa valor mensalid cobranc cartao', () => ({ title: 'Plano ' + plan.n, text: 'Plano ' + plan.n + ', cobrança ' + (o.cycle === 'a' ? 'anual' : 'mensal') + ' de ' + Orb.brl2(Orb.monthly()) + ' por mês no ' + o.cardLabel + '. Próxima cobrança em ' + Orb.daysToCharge() + ' dias.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        ['limites', 'plano', 'Quanto já usei do plano?', 'limit uso usei usad consult armazen espaco cota sobra resta', () => ({ title: 'Uso do plano', text: 'Cosmo: ' + Orb.num(o.usage.cosmo) + ' de ' + lim$(lim.cosmo) + ' consultas. Armazenamento: ' + String(o.usage.storage).replace('.', ',') + ' de ' + lim.storage + ' GB. Contatos: ' + Orb.num(Orb.contactsCount()) + ' de ' + lim$(lim.contacts) + '. Usuários: ' + Orb.seatsUsed() + ' de ' + lim$(lim.seats) + '.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        ['faturas', 'plano', 'Onde vejo minhas faturas?', 'fatura faturas nota boleto recibo pagament historico', () => ({ title: 'Faturas', text: o.invoices.length ? 'Última: ' + o.invoices[0][0] + ', ' + o.invoices[0][1] + ', ' + Orb.brl2(o.invoices[0][2]) + ' em ' + o.invoices[0][3] + '. Em Planos e pagamentos você baixa todas.' : 'Nenhuma fatura ainda.', href: 'Planos.dc.html', cta: 'Ver faturas' })],
        ['mudarPlano', 'ajuda', 'Como mudo de plano?', 'mudar trocar upgrade downgrade cancelar plano melhorar', () => ({ title: 'Mudar de plano', text: 'Em Planos e pagamentos, use "Mudar de plano". No upgrade, a diferença é cobrada proporcional aos dias que faltam.', href: 'Planos.dc.html', cta: 'Ver planos' })],
        ['notif', 'outros', 'Tenho notificações?', 'notifica aviso alerta novidad sino', () => ({ title: 'Notificações', text: unread.length ? Orb.pl(unread.length, 'não lida', 'não lidas') + ': ' + unread.map((n) => n.text).join('; ') + '.' : 'Nenhuma notificação nova.', href: 'Main.dc.html', cta: 'Ver painel' })],
        ['whats', 'ajuda', 'Como conecto o WhatsApp?', 'whatsapp whats zap wpp mensag convers numero instanc', () => ({ title: 'WhatsApp', text: 'Conversas e Instâncias WhatsApp ainda são uma prévia: dá para ver como vai funcionar, mas sem enviar ou receber mensagens.', href: 'Instancias.dc.html', cta: 'Ver instâncias' })],
        ['perfil', 'ajuda', 'Como altero meu perfil?', 'perfil nome foto senha 2fa autentic seguranc tema escuro claro aparenc', () => ({ title: 'Seu perfil', text: 'Em Meu perfil você muda nome, cargo, e-mail, telefone, fuso, notificações e segurança. O botão de meia-lua no topo alterna a aparência clara, escura ou automática.', href: 'Perfil.dc.html', cta: 'Abrir perfil' })],
        ['ia', 'ajuda', 'Como conecto minha IA?', 'conect ia chatgpt claude gemini grok openai inteligencia api chave', () => ({ title: 'Conectar sua IA', text: 'Em Respostas do Cosmo, escolha Claude, ChatGPT, Gemini ou Grok e cole a chave de API da sua conta. O Cosmo passa a responder pela sua IA.', href: 'Cosmo.dc.html', cta: 'Conectar' })],
        ['ajuda', 'ajuda', 'O que você sabe responder?', 'ajuda help sabe voce consegue comando funciona oque responde', () => ({ title: 'O que eu respondo', text: 'Vendas (receita, meta, funil, riscos, maiores negócios), tarefas e agenda, suporte e SLA, nível, ranking e missões, contatos e empresas pelo nome, equipe, plano e uso, e como fazer as coisas no CosmoDash.', href: 'Cosmo.dc.html', cta: 'Ver histórico' })],
        ['oi', 'outros', 'Oi, Cosmo!', 'oi ola bom dia boa tarde noite hey eai salve', () => ({ title: Orb.greeting(), text: 'Sou o Cosmo. Posso ver riscos no funil, a previsão do mês, suas tarefas, o suporte e muito mais. Por onde começamos?', href: '', cta: '' })]
      ];
    },
    cosmo(q) {
      const lim = Orb.plan().limits.cosmo;
      if (q.count !== false && lim !== null && O().usage.cosmo >= lim) return { topic: 'outros', title: 'Limite do plano', text: 'As ' + Orb.num(lim) + ' consultas do Cosmo deste mês acabaram.', href: 'Planos.dc.html', cta: 'Ver planos', hasLink: true, suggestions: [] };
      if (q.count !== false) { O().usage.cosmo++; Orb.save(); }
      const intents = Orb.cosmoIntents();
      const done = (it, extra) => Object.assign({ topic: it[1] }, it[4](), extra || {});
      const finish = (ans, skip, scores) => {
        // Sugestões: primeiro as do mesmo assunto, depois as que mais se parecem com o que foi digitado.
        const same = intents.filter((i) => i[1] === ans.topic && i[0] !== skip);
        const close = scores.filter((x) => x.score > 0 && x.it[0] !== skip).map((x) => x.it);
        const picks = [];
        for (const i of close.concat(same, intents.filter((i) => ['risco', 'prev', 'tarefas', 'sup'].includes(i[0])))) if (i[0] !== skip && !picks.includes(i) && picks.length < 3) picks.push(i);
        return Object.assign(ans, { hasLink: !!ans.href, suggestions: picks.map((i) => ({ id: i[0], label: i[2] })) });
      };
      if (q.id) { const it = intents.find((i) => i[0] === q.id); if (it) return finish(done(it), it[0], []); }
      const t = unaccent((q.text || '').toLowerCase()).replace(/[^a-z0-9\s]/g, ' ');
      const words = t.split(/\s+/).filter(Boolean);
      const lev = (a, b) => {
        const d = Array.from({ length: b.length + 1 }, (_, j) => j);
        for (let i = 1; i <= a.length; i++) { let prev = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; } }
        return d[b.length];
      };
      // Radical curto exige a palavra exata; radical longo aceita prefixo e 1 ou 2 letras trocadas depois das 2 primeiras.
      // Devolve 1 para acerto exato, 0,5 para acerto com erro de digitação e 0 sem acerto.
      const hit = (kw, slack) => {
        if (words.some((w) => (kw.length <= 3 ? w === kw : w.startsWith(kw)))) return 1;
        if (kw.length <= 3) return 0;
        const tol = (kw.length >= 8 ? 2 : kw.length >= 5 ? 1 : 0) + slack;
        return words.some((w) => w.slice(0, 2) === kw.slice(0, 2) && w.length >= kw.length - 1 && lev(w.slice(0, kw.length), kw) <= tol) ? 0.5 : 0;
      };
      const score = (it, slack) => {
        let n = 0;
        for (const kw of it[3].split(' ')) n += hit(kw, slack) * (kw.length >= 5 ? 2 : 1);
        if (unaccent(it[2].toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').trim() === t.trim()) n += 10;
        return n;
      };
      const scores = intents.map((it) => ({ it, score: score(it, 0) })).sort((a, b) => b.score - a.score);
      const best = scores[0];
      const o = O();
      const name = (n) => unaccent(n.toLowerCase()).replace(/^dra?\.?\s*/, '').split(/\s+/);
      const person = o.contacts.find((c) => name(c.name).some((p) => p.length > 2 && words.includes(p)));
      const GENERIC = ['grupo', 'banco', 'clinica', 'digital', 'energia', 'engenharia', 'logistica', 'textil', 'hoteis'];
      const coNames = Array.from(new Set(o.deals.map((d) => d.co).concat(o.companies.map((c) => c[0]), o.contacts.map((c) => c.co))));
      const company = coNames.find((co) => name(co).some((p) => p.length > 3 && !GENERIC.includes(p) && words.includes(p)));
      if (person && best.score < 4) return finish({ topic: 'contato', title: person.name, text: person.role + ' em ' + person.co + '. E-mail ' + person.email + (person.phone ? ', telefone ' + person.phone : '') + '. Último contato há ' + person.days + ' dias.' + (person.tip ? ' Dica: ' + person.tip : ''), href: 'Contatos.dc.html?c=' + person.id, cta: 'Abrir ficha' }, '', scores);
      if (company && best.score < 4) {
        const ds = o.deals.filter((d) => d.co === company && d.status === 'open' && Orb.dealVisible(d));
        const cs = o.contacts.filter((c) => c.co === company);
        return finish({ topic: 'contato', title: company, text: (ds.length ? 'Negócios abertos: ' + ds.map((d) => Orb.mil(d.v) + ' em ' + SEED.stages[d.st] + ', ' + d.d + ' dias sem interação').join('; ') + '. ' : 'Nenhum negócio aberto. ') + (cs.length ? 'Contatos: ' + cs.map((c) => c.name + ' (' + c.role + ')').join(', ') + '.' : ''), href: ds.length ? 'Pipeline.dc.html?deal=' + ds[0].id : 'Contatos.dc.html', cta: ds.length ? 'Abrir negócio' : 'Abrir contatos' }, '', scores);
      }
      if (best.score >= 2 || (best.score >= 1 && best.score > scores[1].score)) return finish(done(best.it), best.it[0], scores.slice(1));
      // Nada claro: tenta de novo com mais tolerância. Um vencedor claro responde; senão, só sugere.
      const loose = intents.map((it) => ({ it, score: score(it, 1) })).sort((a, b) => b.score - a.score);
      if (loose[0].score >= 2 && loose[0].score > loose[1].score) return finish(done(loose[0].it), loose[0].it[0], loose.slice(1));
      return finish({ topic: 'outros', title: 'Não achei uma resposta exata', text: loose[0].score ? 'Talvez você queira saber uma destas:' : 'Não entendi. Tente uma destas perguntas, ou pergunte "o que você sabe responder".', href: '', cta: '' }, '', loose);
    },

    // IA do cliente: ele conecta a própria conta (chave de API) e ela responde como o Cosmo.
    // shortcut: a chave fica no localStorage deste navegador; com backend, guardar criptografada no servidor.
    AI: {
      anthropic: { n: 'Claude (Anthropic)', model: 'claude-haiku-5-5', keyUrl: 'https://console.anthropic.com/settings/keys' },
      openai: { n: 'ChatGPT (OpenAI)', model: 'gpt-5-mini', keyUrl: 'https://platform.openai.com/api-keys' },
      google: { n: 'Gemini (Google)', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey' },
      xai: { n: 'Grok (xAI)', model: 'grok-4', keyUrl: 'https://console.x.ai' }
    },
    TOPICS: { risco: 'Negócios em risco', prev: 'Previsão do mês', semana: 'Resumo da semana', vendas: 'Vendas e funil', tarefas: 'Tarefas e agenda', sup: 'Suporte', metas: 'Metas e ranking', contato: 'Contatos e empresas', equipe: 'Equipe e organizações', plano: 'Plano e cobrança', ajuda: 'Como usar o CosmoDash', outros: 'Outros assuntos' },
    ai: () => db.ai || null,
    setAI(provider, key, model) {
      if (!Orb.AI[provider]) return 'Escolha um provedor.';
      if (!(key || '').trim()) return 'Cole a chave de API.';
      db.ai = { provider, key: key.trim(), model: (model || '').trim() || Orb.AI[provider].model };
      Orb.save(); return '';
    },
    clearAI() { delete db.ai; Orb.save(); },
    cosmoLog: () => (O().cosmoLog = O().cosmoLog || []),
    cosmoContext() {
      const s = Orb.totals(), o = O();
      const deal = (d) => d.co + ' (' + Orb.mil(d.v) + ', ' + SEED.stages[d.st] + ', ' + d.d + ' dias sem interação)';
      return [
        'Você é o Cosmo, assistente de vendas do CRM CosmoDash, inspirado no Jarvis: direto, prestativo e com iniciativa.',
        'Responda em português do Brasil, em até 4 frases, usando só os dados abaixo. Se faltar dado, diga isso.',
        'Organização: ' + o.name + '. Usuário: ' + db.profile.name + '. Hoje: ' + Orb.today() + ', faltam ' + Orb.daysLeftInMonth() + ' dias para fechar o mês.',
        'Receita ganha no mês: ' + Orb.brl(s.won) + ' de meta ' + Orb.brl(o.k.goal) + '. Pipeline aberto: ' + Orb.mil(s.open) + ' em ' + s.count + ' negócios.',
        'Em risco (10+ dias parados): ' + (s.risk.map(deal).join('; ') || 'nenhum') + '.',
        'Em fechamento: ' + (Orb.openDeals().filter((d) => d.st === 4).map(deal).join('; ') || 'nenhum') + '.',
        'Tickets de suporte abertos: ' + Orb.ticketsOpen() + '. Tarefas pendentes: ' + Orb.tasksPending() + '.',
        'Contatos: ' + o.contacts.slice(0, 30).map((c) => c.name + ' (' + c.role + ', ' + c.co + ', último contato há ' + c.days + ' dias)').join('; ') + '.'
      ].join('\n');
    },
    // Chama a API do provedor direto do navegador. history: [{ role: 'user'|'assistant', text }].
    async askAI(history) {
      const a = db.ai, sys = Orb.cosmoContext();
      const msgs = history.map((m) => ({ role: m.role, content: m.text }));
      const post = async (url, headers, body) => {
        const r = await fetch(url, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers), body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || 'HTTP ' + r.status);
        return j;
      };
      if (a.provider === 'anthropic') {
        const j = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': a.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, { model: a.model, max_tokens: 600, system: sys, messages: msgs });
        return j.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
      }
      if (a.provider === 'google') {
        const j = await post('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(a.model) + ':generateContent', { 'x-goog-api-key': a.key }, { systemInstruction: { parts: [{ text: sys }] }, contents: history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })) });
        return j.candidates[0].content.parts.map((p) => p.text).join('');
      }
      const url = a.provider === 'xai' ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const j = await post(url, { authorization: 'Bearer ' + a.key }, { model: a.model, messages: [{ role: 'system', content: sys }].concat(msgs) });
      return j.choices[0].message.content;
    },
    // Pergunta ao Cosmo: limite do plano e assunto pelas regras; resposta pela IA do cliente quando conectada.
    async askCosmo(text, history = [], id = '') {
      let ans = Orb.cosmo({ text, id });
      if (ans.title !== 'Limite do plano' && db.ai) {
        try {
          const reply = await Orb.askAI(history.concat([{ role: 'user', text }]));
          ans = { topic: ans.topic, title: 'Cosmo · ' + Orb.AI[db.ai.provider].n, text: reply.trim(), href: ans.href, cta: ans.cta, hasLink: ans.hasLink, suggestions: ans.suggestions, by: 'ia' };
        } catch (e) {
          ans = Object.assign({}, ans, { text: 'Não consegui falar com ' + Orb.AI[db.ai.provider].n + ' (' + e.message + '). Pelas regras: ' + ans.text, by: 'erro' });
        }
      }
      const log = Orb.cosmoLog();
      log.unshift({ q: text, topic: ans.topic, title: ans.title, text: ans.text, ts: Date.now() });
      log.length = Math.min(log.length, 200);
      Orb.save();
      return ans;
    },

    // Organizações
    setOrg(id) { db.org = id; db.toast = 'Você está em ' + db.orgs[id].name; Orb.save(); },
    createOrg(name) {
      const id = 'o' + Date.now();
      const clean = name.trim();
      db.orgs[id] = { name: clean, mark: Orb.ini(clean) || 'NO', color: 'var(--accent-text)', role: 'Admin', plan: 'starter', cycle: 'm', pay: 'c', cardLabel: 'Sem cartão cadastrado',
        me: { lvl: 1, xp: 0, season: 0, streak: 0, squad: 'Geral', won: 0, goalWon: 10000, created: 0, createdGoal: 5, acts: 0, actsGoal: 20 },
        k: { wonBase: 0, wonCount: 0, goal: 10000, delta: '', conv: '—', convDelta: '', up: true, sla: '—', first: '—', csat: '—', spark: '0,36 200,36', cycleDays: 0, weekWon: 0, weekVal: 0, weekActs: 0, leadReply: '—' },
        bars: [0, 0, 0, 0, 0], funnels: [{ id: 'b2b', name: 'Vendas' }], hid: {}, deals: [], people: [{ i: 'CA', n: db.profile.name, e: db.profile.email, sq: 'Geral', lv: 1, last: 'agora', tfa: true, c: SEED.colors.CA, role: 'Admin', season: 0 }], hidMembers: 0, invites: [], squads: ['Geral'], squad: { lvl: 1, pct: 0, won: 0, goalWon: 10000, wins: 0, winsGoal: 3, resp: '—', respGoal: '—' }, contactsBase: 0, companies: [], contacts: [], tasks: [], teamToday: [], hidTickets: {}, tickets: [], feed: [], notifications: [], usage: { cosmo: 0, storage: 0 }, invoices: [], perms: clone(SEED.perms), xpLog: {}, audit: [], counters: {}, joined: {}, claimed: {} };
      db.org = id; db.toast = 'Organização ' + clean + ' criada';
      Orb.save();
      return id;
    },
    orgMembers: (o) => o.people.length + (o.hidMembers || 0),

    flash(c, text) { c.setState({ toast: text }); clearTimeout(c._t); c._t = setTimeout(() => c.setState({ toast: null }), 2800); },

    // Valores do menu lateral e do toast, comuns a todas as telas.
    shell(c, cur) {
      if (db.toast) { const t = db.toast; db.toast = null; Orb.save(); setTimeout(() => Orb.flash(c, t)); }
      const s = c.state;
      const IC = { dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', pipe: 'M3 4h18l-7 8.5V19l-4 2v-8.5z', cont: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', task: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', sup: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z', goal: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3', team: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', plan: 'M2 5h20v14H2zM2 10h20M6 15h4', chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', wpp: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', org: 'M3 21h18M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 9h3a1 1 0 0 1 1 1v11M9 7h2M9 11h2M9 15h2', cosmo: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' };
      const pending = Orb.tasksPending();
      const NAV = [['Main.dc.html', 'Painel', 'dash'], ['Conversas.dc.html', 'Conversas', 'chat'], ['Contatos.dc.html', 'Contatos', 'cont'], ['Pipeline.dc.html', 'Funil de vendas', 'pipe', String(Orb.totals().count)], ['Tarefas.dc.html', 'Tarefas', 'task', pending ? String(pending) : ''], ['Cosmo.dc.html', 'Respostas do Cosmo', 'cosmo'], ['Instancias.dc.html', 'Instâncias WhatsApp', 'wpp'], ['Metas.dc.html', 'Metas e conquistas', 'goal'], ['Organizacoes.dc.html', 'Organizações', 'org'], ['Equipe.dc.html', 'Equipe e permissões', 'team'], ['Planos.dc.html', 'Planos e pagamentos', 'plan'], ['Perfil.dc.html', 'Meu perfil', 'user'], ['Suporte.dc.html', 'Suporte interno', 'sup', String(Orb.ticketsOpen())]];
      const nav = NAV.map((a) => ({ link: true, href: a[0], label: a[1], d: IC[a[2]], badge: a[3] || '', hasBadge: !!a[3], cls: a[0] === cur ? 'nav on' : 'nav', current: a[0] === cur ? 'page' : false }));
      const links = nav.filter((n) => n.link);
      // No celular a barra .rail rola na horizontal; deixa a tela ativa à vista depois do desenho e das fontes, que mudam as larguras.
      if (typeof document !== 'undefined' && !c._navShown) {
        c._navShown = true;
        setTimeout(() => document.fonts.ready.then(() => { const r = document.querySelector('.rail'), a = r && r.querySelector('.rail-btn.on'); if (a && r.scrollWidth > r.clientWidth) r.scrollLeft += a.getBoundingClientRect().left - r.getBoundingClientRect().left - 16; }));
      }
      const SHORT = { 'Pipeline.dc.html': 'Funil' };
      // Aparência: o botão do topo alterna automática, clara e escura.
      const SCH = { auto: ['light', 'Aparência automática', 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 3v18'], light: ['dark', 'Aparência clara', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'], dark: ['auto', 'Aparência escura', 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'] };
      const sch = SCH[db.profile.prefs.scheme] ? db.profile.prefs.scheme : 'auto';
      const o = O();
      const lv = Orb.level();
      const name = db.profile.name;
      const orgView = { name: o.name, mark: o.mark, color: o.color, role: o.role, planName: Orb.plan().n };
      const orgList = Object.keys(db.orgs).map((id) => ({ name: db.orgs[id].name, mark: db.orgs[id].mark, color: db.orgs[id].color, role: db.orgs[id].role, plan: SEED.plans[db.orgs[id].plan].n, cls: id === db.org ? 'rowb on' : 'rowb', pick: () => { if (id === db.org) return c.setState({ orgOpen: false }); Orb.setOrg(id); location.reload(); } }));
      return {
        shell: db.collapsed ? 'collapsed' : '', chev: db.collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6',
        toggle: () => { db.collapsed = !db.collapsed; Orb.save(); c.setState({}); },
        nav, org: orgView, orgOpen: !!s.orgOpen, orgList, toggleOrg: () => c.setState({ orgOpen: !s.orgOpen }),
        userName: name, userIni: Orb.ini(name), userPhoto: db.profile.photo ? "background-image:url('" + db.profile.photo + "');background-size:cover;color:transparent;" : '',
        xpTier: 'Nível ' + lv.lvl + ' · ' + lv.tier, xpNext: lv.lvl + 1,
        xpLabel: Orb.num(lv.xp) + ' / ' + Orb.num(lv.max), xpPct: lv.pct + '%', xpLeft: Orb.num(lv.left),
        rail: links.map((n) => Object.assign({}, n, { cls: n.href === cur ? 'rail-btn on' : 'rail-btn' })),
        tabs: links.slice(0, 4).map((n) => Object.assign({}, n, { cls: n.href === cur ? 'tab on' : 'tab glass', short: SHORT[n.href] || n.label })),
        schemeIcon: SCH[sch][2], schemeLabel: SCH[sch][1] + '. Clique para trocar',
        cycleScheme: () => { db.profile.prefs.scheme = SCH[sch][0]; Orb.save(); if (Orb.applyPrefs) Orb.applyPrefs(); c.setState({}); },
        hasToast: !!s.toast, toast: s.toast || ''
      };
    },

    templates: {
      sidebar: `<aside class="rail glass" aria-label="Navegação principal">
  <sc-for list="{{rail}}" as="n">
    <a href="{{n.href}}" class="{{n.cls}}" aria-label="{{n.label}}" aria-current="{{n.current}}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="{{n.d}}"></path></svg><span class="tip">{{n.label}}</span><sc-if value="{{n.hasBadge}}"><span class="dot">{{n.badge}}</span></sc-if></a>
  </sc-for>
</aside>
<header class="topbar">
  <div class="tb-side">
    <a href="Main.dc.html" class="circle brand-mark" aria-label="CosmoDash: início"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"></ellipse></svg></a>
    <div class="orgwrap">
      <button class="org glass" onClick="{{toggleOrg}}" aria-label="Trocar organização" aria-expanded="{{orgOpen}}">
        <span class="orgmark" style="background:{{org.color}}">{{org.mark}}</span>
        <span class="org-txt" style="min-width:0"><span class="org-name">{{org.name}}</span><span class="org-sub">{{org.role}} · Plano {{org.planName}}</span></span>
        <svg class="ico s org-txt" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"></path></svg>
      </button>
      <sc-if value="{{orgOpen}}">
        <div class="orgmenu">
          <div class="caption t2" style="padding:6px 8px">Suas organizações</div>
          <sc-for list="{{orgList}}" as="o">
            <button class="{{o.cls}}" onClick="{{o.pick}}" style="padding:8px">
              <span class="orgmark" style="background:{{o.color}}">{{o.mark}}</span>
              <span style="flex:1;min-width:0"><span class="om-name">{{o.name}}</span><span class="om-sub">{{o.role}} · {{o.plan}}</span></span>
            </button>
          </sc-for>
          <a class="btn ghost sm" href="Organizacoes.dc.html?new=1" style="justify-content:flex-start">+ Nova organização</a>
        </div>
      </sc-if>
    </div>
  </div>
  <nav class="tabs" aria-label="Comercial">
    <sc-for list="{{tabs}}" as="t"><a href="{{t.href}}" class="{{t.cls}}" aria-current="{{t.current}}"><svg class="ico s" viewBox="0 0 24 24" aria-hidden="true"><path d="{{t.d}}"></path></svg><span class="lbl">{{t.short}}</span></a></sc-for>
  </nav>
  <div class="tb-side end">
    <a href="Main.dc.html#cosmo-q" class="circle glass" aria-label="Perguntar ao Cosmo"><svg class="ico s" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"></path></svg></a>
    <button class="circle glass" onClick="{{cycleScheme}}" aria-label="{{schemeLabel}}" title="{{schemeLabel}}"><svg class="ico s" viewBox="0 0 24 24" aria-hidden="true"><path d="{{schemeIcon}}"></path></svg></button>
    <a href="Perfil.dc.html" class="circle" aria-label="Meu perfil: {{userName}}"><span class="av me" style="width:38px;height:38px;flex-basis:38px;{{userPhoto}}">{{userIni}}</span><span class="status-dot"></span></a>
  </div>
</header>`,
      toast: `<sc-if value="{{hasToast}}"><div class="toast" role="status"><span class="orb" style="width:22px;height:22px;flex-basis:22px" aria-hidden="true"></span><span style="font-weight:700;font-size:13.5px">{{toast}}</span></div></sc-if>`
    }
  };

  g.Orb = Orb;
  if (typeof module !== 'undefined') module.exports = Orb;

  if (typeof document === 'undefined') return;

  const applyPrefs = () => {
    const p = db.profile.prefs;
    document.documentElement.classList.toggle('no-motion', !p.motion);
    document.documentElement.classList.toggle('compact', !!p.compact);
    // Aparência das telas no padrão Apple: auto segue o sistema; light e dark fixam.
    document.documentElement.setAttribute('data-color-scheme', p.scheme || 'auto');
  };
  Orb.applyPrefs = applyPrefs;
  applyPrefs();

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]';
  let lastFocus = null;
  document.addEventListener('keydown', (e) => {
    const modal = document.querySelector('.ov .modal');
    if (e.key === 'Escape' && modal) { const close = modal.querySelector('[data-close]'); if (close) close.click(); return; }
    if (e.key === 'Tab' && modal) {
      const items = [...modal.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } else if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
    const el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el.matches && el.matches('tr.rw,[role="button"]')) { e.preventDefault(); el.click(); }
  });
  // Foco entra no modal ao abrir e volta ao botão de origem ao fechar.
  new MutationObserver(() => {
    const modal = document.querySelector('.ov .modal');
    if (modal && !modal.dataset.focused) {
      modal.dataset.focused = '1';
      lastFocus = document.activeElement;
      const first = modal.querySelector('input,select,textarea') || modal.querySelector(FOCUSABLE);
      if (first) first.focus();
    } else if (!modal && lastFocus) {
      if (document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
