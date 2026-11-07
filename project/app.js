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
  // Sorteio determinístico (mulberry32): o mesmo mês da mesma organização gera sempre os mesmos números.
  const rng = (seed) => { let h = 1779033703; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), h = (h << 13) | (h >>> 19); let a = h >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
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
      const list = O().people.map((p) => ({ i: p.i, name: Orb.person(p.i).n, ini: p.i === 'CA' ? Orb.ini(db.profile.name) : p.i, color: p.c, sub: (p.i === 'CA' ? 'Você · ' : p.role + ' · ') + p.sq, season: p.i === 'CA' ? Orb.season() : p.season, me: p.i === 'CA' }));
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
    cosmoIntents(text) {
      const s = Orb.totals(), o = O(), k = o.k;
      const words = unaccent((text || '').toLowerCase()).split(/[^a-z0-9]+/);
      const M = Orb.months(), bars = o.bars.concat([Math.round(s.won / 1000)]);
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
        // Vendas: histórico mensal, etapas, origem e donos
        ['melhorMes', 'vendas', 'Qual foi meu maior faturamento?', 'maior melhor recorde pico faturament receit mes', () => { const i = bars.indexOf(Math.max(...bars)); return { title: 'Melhor mês', text: 'O maior faturamento dos últimos 6 meses foi em ' + M[i] + ': R$ ' + bars[i] + ' mil' + (i === 5 ? ' (o mês atual, ainda em aberto)' : '') + '. Meses: ' + M.map((m, j) => m + ' ' + bars[j] + 'k').join(', ') + '.', href: 'Main.dc.html', cta: 'Ver gráfico' }; }],
        ['piorMes', 'vendas', 'Qual foi o pior mês de vendas?', 'pior menor fraco baixo ruim faturament receit mes', () => { const i = bars.indexOf(Math.min(...bars)); return { title: 'Pior mês', text: 'O menor faturamento dos últimos 6 meses foi em ' + M[i] + ': R$ ' + bars[i] + ' mil.', href: 'Main.dc.html', cta: 'Ver gráfico' }; }],
        ['historico', 'vendas', 'Como foi a receita nos últimos meses?', 'historic evoluc ultimos meses grafico tendenc cresciment', () => ({ title: 'Receita dos últimos 6 meses', text: M.map((m, j) => m + ': R$ ' + bars[j] + ' mil').join('; ') + '. ' + (bars[5] >= bars[4] ? 'Tendência de alta.' : 'Abaixo do mês anterior até agora.'), href: 'Main.dc.html', cta: 'Ver gráfico' })],
        ['media', 'vendas', 'Qual a média de faturamento por mês?', 'media mensal medio por mes faturament', () => { const prev = o.bars; return { title: 'Média mensal', text: 'Média dos 5 meses fechados: R$ ' + Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) + ' mil por mês. A meta mensal é ' + Orb.brl(k.goal) + '.', href: 'Main.dc.html', cta: 'Ver gráfico' }; }],
        ['vsAnterior', 'vendas', 'Estou melhor que no mês passado?', 'passado anterior compar versus diferenc cresc caiu subiu', () => ({ title: 'Contra o mês anterior', text: M[5] + ' está em ' + Orb.brl(s.won) + ' contra R$ ' + bars[4] + ' mil em ' + M[4] + (k.delta ? ' (' + k.delta + ')' : '') + '.', href: 'Main.dc.html', cta: 'Ver painel' })],
      ].concat(SEED.stages.map((st, i) => ['etapa' + i, 'vendas', 'Quantos negócios estão em ' + st + '?', unaccent(st.toLowerCase()).slice(0, 7) + ' etapa', () => { const ds = open.filter((d) => d.st === i); return { title: st, text: Orb.pl(ds.length, 'negócio', 'negócios') + ' em ' + st + ' somando ' + Orb.mil(ds.reduce((a, d) => a + d.v, 0)) + (ds.length ? ': ' + list(ds) : '') + '. Probabilidade da etapa: ' + Math.round(SEED.probs[i] * 100) + '%.', href: 'Pipeline.dc.html', cta: 'Abrir funil' }; }])).concat([
        ['origem', 'vendas', 'De onde vêm meus leads?', 'origem fonte canal vem vieram inbound outbound indicac evento webinar', () => { const c = {}; open.forEach((d) => { c[d.src] = (c[d.src] || 0) + 1; }); return { title: 'Origem dos negócios', text: Object.keys(c).sort((a, b) => c[b] - c[a]).map((x) => x + ': ' + c[x]).join(', ') + '.', href: 'Pipeline.dc.html', cta: 'Abrir funil' }; }],
        ['porDono', 'vendas', 'Quantos negócios cada vendedor tem?', 'cada vendedor dono responsav quem carteira dividid distribu', () => { const c = {}; open.forEach((d) => { c[d.o] = (c[d.o] || 0) + d.v; }); return { title: 'Pipeline por vendedor', text: Object.keys(c).sort((a, b) => c[b] - c[a]).map((x) => Orb.person(x).n + ' ' + Orb.mil(c[x])).join(', ') + '.', href: 'Pipeline.dc.html', cta: 'Abrir funil' }; }],
        ['meus', 'vendas', 'Quais são os meus negócios?', 'meus minha carteira proprio sob responsab', () => { const ds = open.filter((d) => d.o === 'CA'); return { title: 'Seus negócios', text: ds.length ? Orb.pl(ds.length, 'negócio', 'negócios') + ' somando ' + Orb.mil(ds.reduce((a, d) => a + d.v, 0)) + ': ' + list(ds) + '.' : 'Nenhum negócio aberto em seu nome.', href: 'Pipeline.dc.html?filter=mine', cta: 'Abrir funil' }; }],
        ['menor', 'vendas', 'Quais são os menores negócios?', 'menor menores pequen baixo valor', () => ({ title: 'Menores negócios abertos', text: byValue.length ? list(byValue.slice(-5).reverse()) + '.' : 'Nenhum negócio aberto.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['valorMedio', 'vendas', 'Qual o valor médio dos negócios abertos?', 'valor medio media negocio abert', () => ({ title: 'Valor médio em aberto', text: open.length ? Orb.brl(open.reduce((a, d) => a + d.v, 0) / open.length) + ' por negócio, em ' + Orb.pl(open.length, 'negócio aberto', 'negócios abertos') + '.' : 'Nenhum negócio aberto.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['recentes', 'vendas', 'Quais negócios tiveram contato recente?', 'recent ultimo atualiz ativo quente movimen', () => { const ds = open.slice().sort((a, b) => a.d - b.d).slice(0, 5); return { title: 'Interação recente', text: list(ds) + '.', href: 'Pipeline.dc.html', cta: 'Abrir funil' }; }],
        ['funis', 'vendas', 'Quais funis eu tenho?', 'funis funil quais lista existem', () => ({ title: 'Funis', text: o.funnels.map((f) => f.name).join(', ') + '. Cada funil tem as etapas ' + SEED.stages.join(', ') + '.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['novoFunil', 'ajuda', 'Como crio um novo funil?', 'criar novo funil pipeline outro', () => ({ title: 'Criar funil', text: Orb.can('pipe') ? 'No Funil de vendas, clique em "+ Novo funil" e dê um nome.' : 'Seu papel não pode criar funis. Peça a um Admin ou Gestor.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['ganhar', 'ajuda', 'Como marco um negócio como ganho?', 'marcar ganho ganhar fechar venda concluir', () => ({ title: 'Marcar como ganho', text: 'Abra o negócio no Funil e clique em "Marcar como ganho". Vale 50 XP mais 3 por mil reais.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['perder', 'ajuda', 'Como marco um negócio como perdido?', 'marcar perdido perder desistiu cancelou', () => ({ title: 'Marcar como perdido', text: 'Abra o negócio no Funil, clique em "Perdido" e informe o motivo. Dá para reabrir depois.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        ['atividade', 'ajuda', 'Como registro uma atividade?', 'registrar atividade anotar nota ligacao feita', () => ({ title: 'Registrar atividade', text: 'Abra o negócio no Funil e use "Registrar atividade": ligação, e-mail, reunião ou nota. Vale XP (até 5 por dia) e libera o XP do avanço de etapa.', href: 'Pipeline.dc.html', cta: 'Abrir funil' })],
        // Tarefas
        ['amanha', 'tarefas', 'O que tenho amanhã?', 'amanha proximo dia reuniao ligacao', () => { const ts = o.tasks.filter((t) => t.date === Orb.addDays(1)); return { title: 'Amanhã', text: ts.length ? ts.map((t) => t.h + ' ' + t.t).join('; ') + '.' : 'Nenhuma tarefa para amanhã.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' }; }],
        ['semanaT', 'tarefas', 'Quais tarefas tenho nesta semana?', 'semana proximos dias periodo', () => { const ts = o.tasks.filter((t) => !t.done && t.date >= Orb.today() && t.date <= Orb.addDays(7)); return { title: 'Próximos 7 dias', text: ts.length ? Orb.pl(ts.length, 'tarefa', 'tarefas') + ': ' + ts.map((t) => Orb.dayLabel(t.date) + ' ' + t.h + ' ' + t.t).join('; ') + '.' : 'Nada pendente nos próximos 7 dias.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' }; }],
        ['concluidas', 'tarefas', 'Quais tarefas já concluí hoje?', 'conclui concluid feito feitas terminei finaliz', () => { const ts = tasksToday.filter((t) => t.done); return { title: 'Concluídas hoje', text: ts.length ? ts.map((t) => t.t).join('; ') + '.' : 'Nenhuma ainda.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' }; }],
      ]).concat([['Ligação', 'ligacoes', 'Quantas ligações tenho hoje?', 'ligac ligar telefon chamada'], ['Reunião', 'reunioes', 'Quantas reuniões tenho hoje?', 'reunio reuniao encontro call meet'], ['E-mail', 'emails', 'Quais e-mails preciso enviar hoje?', 'email emails mandar enviar'], ['Follow-up', 'followups', 'Quais follow-ups tenho hoje?', 'follow retorno cobrar acompanh']].map(([type, id, label, kw]) => [id, 'tarefas', label, kw + ' hoje', () => { const ts = pendingToday.filter((t) => t.type === type); return { title: type + ' hoje', text: ts.length ? Orb.pl(ts.length, 'pendente', 'pendentes') + ': ' + ts.map((t) => t.h + ' ' + t.t).join('; ') + '.' : 'Nenhuma ' + type.toLowerCase() + ' pendente hoje.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' }; }])).concat([
        ['equipeHoje', 'tarefas', 'Como está a equipe nas tarefas hoje?', 'equipe time pessoal tarefas hoje produtiv', () => ({ title: 'Equipe hoje', text: o.teamToday.map((m) => Orb.person(m[0]).n + ' ' + m[1] + '/' + m[2]).join(', ') + '.', href: 'Tarefas.dc.html', cta: 'Abrir tarefas' })],
        // Suporte
        ['vencidos', 'sup', 'Quais tickets estão com SLA vencido?', 'vencido estourad atrasad fora prazo sla', () => { const ts = openTickets.filter((x) => Orb.slaInfo(x).min <= 0); return { title: 'SLA vencido', text: ts.length ? ts.map((x) => x.id + ' ' + x.title + ' (' + x.org.split(' · ')[0] + ')').join('; ') + '.' : 'Nenhum ticket com SLA vencido.', href: 'Suporte.dc.html', cta: 'Abrir fila' }; }],
        ['prioridade', 'sup', 'Quantos tickets de alta prioridade?', 'alta media baixa prioridad grave importante', () => { const c = {}; openTickets.forEach((x) => { c[x.prio] = (c[x.prio] || 0) + 1; }); return { title: 'Tickets por prioridade', text: Object.keys(c).map((p) => p + ': ' + c[p]).join(', ') + ' (entre os detalhados na fila).', href: 'Suporte.dc.html', cta: 'Abrir fila' }; }],
        ['categoria', 'sup', 'Quais os assuntos dos tickets?', 'categori assunto tipo motivo tema problemas', () => ({ title: 'Assuntos dos tickets', text: openTickets.map((x) => x.cat + ': ' + x.title).join('; ') + '.', href: 'Suporte.dc.html', cta: 'Abrir fila' })],
        ['canal', 'sup', 'Por quais canais chegam os tickets?', 'canal canais email chat whatsapp interno chegam', () => { const c = {}; openTickets.forEach((x) => { c[x.ch] = (c[x.ch] || 0) + 1; }); return { title: 'Canais', text: Object.keys(c).map((p) => p + ': ' + c[p]).join(', ') + '.', href: 'Suporte.dc.html', cta: 'Abrir fila' }; }],
        ['atendentes', 'sup', 'Quantos tickets cada atendente tem?', 'atendente agente cada responsav carga fila pessoa', () => ({ title: 'Fila por atendente', text: Object.keys(o.hidTickets).map((n) => n + ': ' + (o.hidTickets[n] + openTickets.filter((x) => x.agent === n).length)).join(', ') + '.', href: 'Suporte.dc.html', cta: 'Abrir fila' })],
        ['resolvidos', 'sup', 'Quantos tickets foram resolvidos?', 'resolvid fechad soluc finaliz', () => { const r = o.tickets.filter((x) => x.status === 'resolved'); return { title: 'Resolvidos', text: r.length ? Orb.pl(r.length, 'ticket resolvido', 'tickets resolvidos') + ' nesta sessão: ' + r.map((x) => x.id + (x.inSla ? ' no SLA' : ' fora do SLA')).join(', ') + '.' : 'Nenhum ticket resolvido por aqui ainda. O SLA geral é ' + k.sla + '.', href: 'Suporte.dc.html', cta: 'Abrir fila' }; }],
        ['resolver', 'ajuda', 'Como resolvo um ticket?', 'resolver respond fechar atender ticket chamado', () => ({ title: 'Resolver ticket', text: 'Em Suporte interno, abra o ticket, responda e clique em "Resolver". Dentro do SLA vale 20 XP.', href: 'Suporte.dc.html', cta: 'Abrir fila' })],
        // Metas
        ['temporada', 'metas', 'Quando acaba a temporada?', 'temporad season acaba termina fim trimestre', () => ({ title: 'Temporada ' + Orb.seasonName(), text: 'Termina em ' + Orb.daysLeftInSeason() + ' dias. Você tem ' + Orb.num(Orb.season()) + ' XP e está em ' + Orb.myRank() + 'º.', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['tiers', 'metas', 'Quais são as categorias de nível?', 'categori faixa trilha tier niveis operador especialist estrateg elite vanguard cosmos', () => ({ title: 'Trilha de progressão', text: TIERS.map((t) => t[0] + ' (níveis ' + t[1] + ' a ' + t[2] + '): ' + t[3]).join('; ') + '.', href: 'Metas.dc.html', cta: 'Ver trilha' })],
        ['metasPessoais', 'metas', 'Como estão minhas metas pessoais?', 'metas pessoal individual minhas objetivo progresso', () => ({ title: 'Suas metas', text: 'Receita ' + Orb.mil(o.me.won) + ' de ' + Orb.mil(o.me.goalWon) + '; negócios criados ' + o.me.created + ' de ' + o.me.createdGoal + '; atividades ' + o.me.acts + ' de ' + o.me.actsGoal + '.', href: 'Metas.dc.html', cta: 'Ver metas' })],
        ['rankSquads', 'metas', 'Qual squad está na frente?', 'squads ranking frente lidera melhor time', () => ({ title: 'Ranking de squads', text: Orb.squads().map((q, i) => (i + 1) + 'º ' + q.name + ' (' + Orb.num(q.season) + ' XP)').join(', ') + '.', href: 'Metas.dc.html', cta: 'Ver ranking' })],
        ['feed', 'metas', 'O que a equipe fez recentemente?', 'feed atividade recente equipe aconteceu novidad', () => ({ title: 'Atividade da equipe', text: o.feed.slice(0, 5).map((f) => f.who + ' ' + f.what + ' (' + Orb.ago(f.ts) + ')').join('; ') + '.', href: 'Main.dc.html', cta: 'Ver painel' })],
        // Contatos
        ['totalContatos', 'contato', 'Quantos contatos eu tenho?', 'total quantos contatos base cadastrad', () => ({ title: 'Contatos', text: Orb.num(Orb.contactsCount()) + ' contatos, limite do plano: ' + lim$(lim.contacts) + '.', href: 'Contatos.dc.html', cta: 'Abrir contatos' })],
        ['tags', 'contato', 'Quais contatos são decisores?', 'tag etiqueta decisor cliente expansao enterprise financeiro novo saude', () => { const tag = ['Decisor', 'Cliente', 'Expansão', 'Enterprise', 'Financeiro', 'Novo', 'Saúde', 'Inbound', 'Outbound', 'Indicação', 'Evento'].find((g) => words.includes(unaccent(g.toLowerCase()))) || 'Decisor'; const cs = o.contacts.filter((c) => c.tags.includes(tag)); return { title: 'Tag ' + tag, text: cs.length ? cs.map((c) => c.name + ' (' + c.co + ')').join(', ') + '.' : 'Nenhum contato com essa tag.', href: 'Contatos.dc.html', cta: 'Abrir contatos' }; }],
        ['empresas', 'contato', 'Quais são as empresas clientes?', 'empresas clientes contas carteira lista segmento', () => ({ title: 'Empresas', text: o.companies.map((c) => c[0] + ' (' + c[1] + ', ' + c[2] + ', ' + c[3] + ')').join('; ') + '.', href: 'Contatos.dc.html', cta: 'Abrir contatos' })],
        ['dicas', 'contato', 'Que cliente precisa de atenção?', 'atencao cuidado dica alerta pulso saude cliente', () => { const cs = o.contacts.filter((c) => c.tip).slice(0, 3); return { title: 'Clientes que pedem atenção', text: cs.map((c) => c.name + ': ' + c.tip).join(' '), href: 'Contatos.dc.html', cta: 'Abrir contatos' }; }],
        ['exportar', 'ajuda', 'Como exporto meus contatos?', 'exportar baixar download backup csv', () => ({ title: 'Exportar contatos', text: Orb.can('exp') ? 'Em Contatos, clique em "Exportar CSV".' : 'Seu papel não pode exportar dados.', href: 'Contatos.dc.html', cta: 'Abrir contatos' })],
        // Equipe
        ['squads', 'equipe', 'Quem está em cada squad?', 'squads membros integrantes composic cada', () => ({ title: 'Squads', text: Orb.squads().map((q) => q.name + ': ' + q.members).join('; ') + '.', href: 'Equipe.dc.html', cta: 'Abrir equipe' })],
        ['convites', 'equipe', 'Tenho convites pendentes?', 'convites pendent aguardando aceit enviados', () => ({ title: 'Convites', text: o.invites.length ? o.invites.map((v) => v.e + ' (' + v.role + ', expira em ' + v.exp + ')').join('; ') + '.' : 'Nenhum convite pendente.', href: 'Equipe.dc.html', cta: 'Abrir equipe' })],
        ['tfa', 'equipe', 'Quem está sem verificação em duas etapas?', '2fa duas etapas verificac seguranc autentic', () => { const ps = o.people.filter((p) => !p.tfa); return { title: 'Verificação em duas etapas', text: ps.length ? 'Sem 2FA: ' + ps.map((p) => Orb.person(p.i).n).join(', ') + '.' : 'Toda a equipe usa 2FA.', href: 'Equipe.dc.html', cta: 'Abrir equipe' }; }],
        ['papeis', 'equipe', 'Quais papéis existem?', 'papeis cargos funcoes perfis admin gestor vendedor leitor', () => ({ title: 'Papéis', text: SEED.roles.join(', ') + '. Cada um tem permissões próprias, ajustáveis em Equipe e permissões.', href: 'Equipe.dc.html?tab=p', cta: 'Ver permissões' })],
        ['admins', 'equipe', 'Quem são os administradores?', 'admin administrador gestor gestores lider chefe', () => ({ title: 'Admins e gestores', text: o.people.filter((p) => p.role === 'Admin' || p.role === 'Gestor').map((p) => Orb.person(p.i).n + ' (' + p.role + ')').join(', ') + '.', href: 'Equipe.dc.html', cta: 'Abrir equipe' })],
        ['novaOrg', 'ajuda', 'Como crio uma nova organização?', 'criar nova organizac empresa workspace', () => ({ title: 'Nova organização', text: 'No menu da organização no topo, clique em "+ Nova organização".', href: 'Organizacoes.dc.html?new=1', cta: 'Criar' })],
        // Plano
        ['planos', 'plano', 'Quais planos existem e quanto custam?', 'planos opcoes precos tabela starter pro business comparar', () => ({ title: 'Planos', text: Object.values(SEED.plans).map((p) => p.n + ': R$ ' + p.p + ' por usuário/mês, ' + p.seats).join('; ') + '. No anual há 20% de desconto.', href: 'Planos.dc.html', cta: 'Comparar' })],
        ['cobranca', 'plano', 'Quando é a próxima cobrança?', 'proxima cobranca vencimento quando pagar dia', () => ({ title: 'Próxima cobrança', text: 'Em ' + Orb.daysToCharge() + ' dias (' + Orb.nextCharge().toLocaleDateString('pt-BR') + '), ' + Orb.brl2(Orb.monthly()) + ' no ' + o.cardLabel + '.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        ['armazenamento', 'plano', 'Quanto espaço eu tenho?', 'espaco armazenamento disco gb arquivos storage', () => ({ title: 'Armazenamento', text: String(o.usage.storage).replace('.', ',') + ' GB usados de ' + lim.storage + ' GB.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        ['consultas', 'plano', 'Quantas consultas do Cosmo ainda tenho?', 'consultas cosmo restam sobram limite perguntas', () => ({ title: 'Consultas do Cosmo', text: lim.cosmo === null ? 'Ilimitadas no seu plano.' : Orb.num(Math.max(0, lim.cosmo - o.usage.cosmo)) + ' de ' + Orb.num(lim.cosmo) + ' restantes neste mês. Com a sua IA conectada, as respostas vêm dela.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        ['anual', 'plano', 'Tem desconto no plano anual?', 'anual desconto economia ano', () => ({ title: 'Plano anual', text: 'Sim: no ciclo anual o valor por usuário cai 20%. Hoje sua cobrança é ' + (o.cycle === 'a' ? 'anual' : 'mensal') + '.', href: 'Planos.dc.html', cta: 'Ver planos' })],
        ['cartao', 'plano', 'Qual cartão está cadastrado?', 'cartao forma pagamento credito trocar', () => ({ title: 'Forma de pagamento', text: o.cardLabel + '. Troque em Planos e pagamentos.', href: 'Planos.dc.html', cta: 'Ver plano' })],
        // Perfil, atalhos e conversa
        ['meusDados', 'ajuda', 'Quais são meus dados?', 'meus dados email nome cargo telefone conta', () => ({ title: db.profile.name, text: (db.profile.title || '') + ' · ' + db.profile.email + '. Papel em ' + o.name + ': ' + role + '. Edite em Meu perfil.', href: 'Perfil.dc.html', cta: 'Abrir perfil' })],
        ['atalhos', 'ajuda', 'Quais atalhos de teclado existem?', 'atalho teclado ctrl tecla rapido', () => ({ title: 'Atalhos', text: 'Ctrl K (ou ⌘K no Mac) abre a pergunta ao Cosmo no Painel. Esc fecha a conversa flutuante.', href: 'Main.dc.html', cta: 'Ver painel' })],
        ['restaurar', 'ajuda', 'Como restauro os dados da demonstração?', 'restaurar resetar reiniciar zerar demonstrac original', () => ({ title: 'Restaurar dados', text: 'Em Meu perfil, em "Dados da demonstração", clique em "Restaurar dados originais".', href: 'Perfil.dc.html', cta: 'Abrir perfil' })],
        ['historicoCosmo', 'ajuda', 'Onde vejo as perguntas que já fiz?', 'historico perguntas anteriores antigas fiz respostas', () => ({ title: 'Respostas do Cosmo', text: 'Na aba Respostas do Cosmo ficam as suas perguntas, separadas por assunto.', href: 'Cosmo.dc.html', cta: 'Ver histórico' })],
        ['hoje', 'outros', 'Que dia é hoje?', 'data dia hoje hora horas', () => ({ title: Orb.headerDate(), text: 'Agora são ' + Orb.clock() + '. Faltam ' + Orb.daysLeftInMonth() + ' dias para o fim do mês.', href: '', cta: '' })],
        ['obrigado', 'outros', 'Obrigado, Cosmo!', 'obrigad valeu agradec show otimo perfeito', () => ({ title: 'Por nada', text: 'Estou por aqui. Quer ver mais alguma coisa?', href: '', cta: '' })],
        ['quem', 'outros', 'Quem é você?', 'cosmo jarvis assistente nome', () => ({ title: 'Sou o Cosmo', text: 'O assistente do CosmoDash. Respondo sobre vendas, tarefas, suporte, metas, equipe e plano com os dados da sua organização. Com a sua IA conectada, converso sobre qualquer coisa.', href: 'Cosmo.dc.html', cta: 'Conectar IA' })],
        ['ajuda', 'ajuda', 'O que você sabe responder?', 'ajuda help sabe voce consegue comando funciona oque responde', () => ({ title: 'O que eu respondo', text: 'Vendas (receita, meta, funil, riscos, maiores negócios), tarefas e agenda, suporte e SLA, nível, ranking e missões, contatos e empresas pelo nome, equipe, plano e uso, e como fazer as coisas no CosmoDash.', href: 'Cosmo.dc.html', cta: 'Ver histórico' })],
        ['oi', 'outros', 'Oi, Cosmo!', 'oi ola bom dia boa tarde noite hey eai salve', () => ({ title: Orb.greeting(), text: 'Sou o Cosmo. Posso ver riscos no funil, a previsão do mês, suas tarefas, o suporte e muito mais. Por onde começamos?', href: '', cta: '' })]
      ]);
    },
    // Outras formas de fazer as mesmas perguntas: entram na busca e contam como perguntas prontas.
    COSMO_QS: {
      risco: 'Tem negócio parado?|Quais clientes estão esfriando?|Onde preciso fazer follow-up?|Algum negócio sem interação?',
      prev: 'Vou bater a meta?|Quanto falta para a meta?|Qual a projeção de fechamento?|Como está a meta do mês?',
      semana: 'Me dá um resumo da semana|Como foram os últimos 7 dias?|Balanço da semana',
      receita: 'Quanto faturei este mês?|Qual a receita do mês?|Quanto já ganhamos em vendas?|Qual o resultado do mês?',
      maior: 'Qual o maior negócio aberto?|Quais negócios valem mais?|Top 5 negócios',
      pipeline: 'Qual o valor do funil?|Quantos negócios estão abertos?|Quanto tenho em oportunidades?|Qual o pipeline ponderado?',
      closing: 'O que está perto de fechar?|Quais propostas estão em negociação?|Quais negócios fecham logo?',
      conv: 'Qual o ticket médio?|Qual o ciclo médio de vendas?|Como está minha taxa de conversão?',
      ganhos: 'Quais vendas fechei?|Por que perdi negócios?|Quais foram os últimos ganhos?',
      novoNeg: 'Quero cadastrar uma oportunidade|Como adiciono um negócio novo?|Onde crio um deal?',
      mover: 'Como mudo a etapa de um negócio?|Como passo o negócio para a próxima etapa?|Como arrasto o card no funil?',
      atrasadas: 'Tenho alguma tarefa vencida?|O que ficou para trás?|Quais tarefas passaram do prazo?',
      tarefas: 'O que tenho para fazer hoje?|Qual minha agenda de hoje?|Quantas tarefas faltam hoje?',
      proxima: 'Qual a próxima reunião?|O que tenho agora?|Qual o próximo horário da agenda?',
      novaTarefa: 'Como agendo uma ligação?|Como coloco um lembrete?|Como adiciono uma tarefa?',
      urgente: 'Qual chamado atender primeiro?|Qual ticket é mais crítico?|Qual SLA vence primeiro?',
      sup: 'Quantos tickets estão abertos?|Como está a fila de atendimento?|Tem chamado de cliente?',
      sla: 'Qual o CSAT?|Como está a satisfação dos clientes?|Qual o tempo de primeira resposta?',
      nivel: 'Quanto XP eu tenho?|Quanto falta para subir de nível?|Em que categoria eu estou?',
      ranking: 'Quem está em primeiro?|Em que posição estou?|Quem lidera a temporada?',
      missoes: 'Quais desafios de hoje?|Como estão as missões diárias?|O que falta nas missões?',
      squad: 'Como está o meu time?|Qual a meta do squad?|Quantas vitórias o squad tem?',
      streak: 'Qual minha sequência?|Quantos dias seguidos?|Minha ofensiva está ativa?',
      xpRegras: 'Quanto vale cada ação?|Como funcionam os pontos?|Quais as regras de XP?',
      contatos: 'Quem está há mais tempo sem contato?|Quais clientes sumiram?|Com quem preciso falar?',
      novoContato: 'Como importo uma planilha?|Como adiciono um contato?|Como subo meus clientes?',
      convidar: 'Como adiciono um usuário?|Como dou acesso a alguém?|Como chamo um vendedor para o time?',
      equipe: 'Quantas pessoas tem na equipe?|Quantos usuários temos?|Quem faz parte do time?',
      perm: 'O que eu posso fazer?|Quais minhas permissões?|Sou admin?',
      org: 'Como troco de organização?|Em quais empresas eu estou?|Quantas organizações tenho?',
      plano: 'Quanto pago por mês?|Qual a mensalidade?|Quanto custa meu plano?',
      limites: 'Quanto já usei?|Estou perto do limite?|Qual o uso do plano?',
      faturas: 'Como baixo a fatura?|Qual foi a última fatura?|Onde está o recibo?',
      mudarPlano: 'Como faço upgrade?|Como cancelo o plano?|Quero trocar de plano',
      notif: 'O que tem de novo?|Tenho avisos?|Quais alertas tenho?',
      whats: 'Como conecto o número do WhatsApp?|O CosmoDash manda mensagem?|Como funcionam as conversas?',
      perfil: 'Como mudo minha foto?|Como ativo o modo escuro?|Como troco minha senha?',
      ia: 'Como ligo o ChatGPT?|Posso usar o Claude?|Como conecto o Gemini?|Como uso o Grok?',
      ajuda: 'Me ajuda|O que posso perguntar?|Quais perguntas você responde?',
      oi: 'Olá|Bom dia|Boa tarde|E aí, Cosmo',
      melhorMes: 'Qual foi o melhor mês?|Qual o recorde de vendas?|Em que mês vendi mais?|Qual meu maior faturamento?',
      piorMes: 'Qual mês vendeu menos?|Qual o mês mais fraco?|Qual foi o menor faturamento?',
      historico: 'Qual a evolução da receita?|Como estão as vendas mês a mês?|Mostra o histórico de faturamento',
      media: 'Quanto vendo em média por mês?|Qual a receita média mensal?|Qual a média mensal?',
      vsAnterior: 'Comparado ao mês passado, como estou?|Cresceu em relação ao mês anterior?|Qual a diferença para o mês passado?',
      etapa0: 'Quantos estão em prospecção?|O que tenho em prospecção?',
      etapa1: 'Quantos estão em qualificação?|O que está em qualificação?',
      etapa2: 'Quantas propostas tenho?|Quantos negócios em proposta?',
      etapa3: 'Quantos estão em negociação?|O que está em negociação?',
      etapa4: 'Quantos estão em fechamento?|O que está na etapa de fechamento?',
      origem: 'Qual a fonte dos negócios?|Quantos vieram por indicação?|Qual canal traz mais leads?',
      porDono: 'Qual vendedor tem mais negócios?|Quanto cada vendedor tem no funil?|Como está dividida a carteira?|Qual vendedor tem mais pipeline?',
      meus: 'Quais negócios são meus?|Qual minha carteira?|O que está comigo?',
      menor: 'Qual o menor negócio?|Quais negócios valem menos?',
      valorMedio: 'Qual a média de valor dos negócios?|Quanto vale em média um negócio aberto?',
      recentes: 'Quais negócios estão ativos?|Com quem falei recentemente?|Quais negócios estão quentes?',
      funis: 'Quantos funis tenho?|Quais são meus funis de vendas?',
      novoFunil: 'Como adiciono outro funil?|Posso ter mais de um funil?',
      ganhar: 'Como registro uma venda fechada?|Como concluo um negócio ganho?',
      perder: 'Como registro um negócio perdido?|O cliente desistiu, o que faço?',
      atividade: 'Como anoto uma ligação?|Como registro uma reunião no negócio?',
      amanha: 'Quais tarefas tenho amanhã?|Qual minha agenda de amanhã?',
      semanaT: 'O que tenho nos próximos dias?|Qual minha agenda da semana?',
      concluidas: 'O que já fiz hoje?|Quantas tarefas terminei?',
      ligacoes: 'Para quem preciso ligar hoje?|Quais ligações tenho?',
      reunioes: 'Tenho reunião hoje?|Quais calls tenho hoje?',
      emails: 'Que e-mails tenho que mandar?|Tenho e-mail para enviar hoje?',
      followups: 'Quem preciso cobrar hoje?|Quais retornos tenho hoje?',
      equipeHoje: 'Como está o time nas tarefas?|Quem já fez as tarefas de hoje?',
      vencidos: 'Tem ticket com SLA estourado?|Quais chamados passaram do prazo?',
      prioridade: 'Quantos chamados de prioridade alta?|Quais tickets são de prioridade alta?',
      categoria: 'Quais problemas os clientes relatam?|Sobre o que são os chamados?',
      canal: 'Quantos tickets vieram pelo WhatsApp?|Quais canais de atendimento temos?',
      atendentes: 'Quem está com mais tickets?|Como está a fila de cada atendente?',
      resolvidos: 'Quantos chamados foram fechados?|Quais tickets resolvi?',
      resolver: 'Como respondo um chamado?|Como fecho um ticket?',
      temporada: 'Quantos dias faltam na temporada?|Quando termina o trimestre?',
      tiers: 'Quais são os níveis?|O que ganho em cada categoria?|Qual o nível máximo?',
      metasPessoais: 'Quais são minhas metas?|Como está meu progresso nas metas?',
      rankSquads: 'Qual o melhor squad?|Como está o ranking dos times?',
      feed: 'O que aconteceu no time?|Quais as últimas atividades?|Quem ganhou negócio hoje?',
      totalContatos: 'Qual o tamanho da minha base?|Quantos clientes cadastrados?',
      tags: 'Quem são os decisores?|Quais contatos são clientes?|Quais contatos têm a tag Expansão?',
      empresas: 'Quais empresas atendemos?|Qual minha lista de clientes?',
      dicas: 'Qual cliente está em risco de cancelar?|Qual cliente precisa de cuidado?',
      exportar: 'Como baixo meus contatos?|Como faço backup dos contatos?',
      squads: 'Quais squads existem?|Quem faz parte de cada time?',
      convites: 'Quem foi convidado?|Algum convite aguardando?',
      tfa: 'Quem não tem 2FA?|A equipe está segura?',
      papeis: 'Quais funções existem?|Que perfis de acesso existem?',
      admins: 'Quem é o administrador?|Quem são os gestores?',
      novaOrg: 'Como adiciono outra empresa?|Posso ter mais de uma organização?',
      planos: 'Quanto custa o plano Business?|Qual a diferença entre os planos?|Quais os preços?',
      cobranca: 'Quando vence a mensalidade?|Que dia sou cobrado?',
      armazenamento: 'Quantos GB eu uso?|Quanto espaço sobra?',
      consultas: 'Quantas perguntas posso fazer ao Cosmo?|Quantas consultas restam?',
      anual: 'Vale a pena pagar anual?|Quanto economizo no anual?',
      cartao: 'Com qual cartão eu pago?|Como troco o cartão?',
      meusDados: 'Qual meu email?|Qual meu cargo?|Quais dados tenho no perfil?',
      atalhos: 'Tem atalho para o Cosmo?|Como abro o Cosmo pelo teclado?',
      restaurar: 'Como volto os dados originais?|Como reinicio a demonstração?',
      historicoCosmo: 'Onde ficam minhas perguntas antigas?|Tem histórico das conversas?',
      hoje: 'Que horas são?|Qual a data de hoje?',
      quem: 'Qual o seu nome?|Você é uma IA?|O que é o Cosmo?',
      obrigado: 'Valeu!|Muito obrigado|Show, obrigado'
    },
    cosmo(q) {
      const lim = Orb.plan().limits.cosmo;
      if (q.count !== false && lim !== null && O().usage.cosmo >= lim) return { topic: 'outros', title: 'Limite do plano', text: 'As ' + Orb.num(lim) + ' consultas do Cosmo deste mês acabaram.', href: 'Planos.dc.html', cta: 'Ver planos', hasLink: true, suggestions: [] };
      if (q.count !== false) { O().usage.cosmo++; Orb.save(); }
      const intents = Orb.cosmoIntents(q.text);
      const done = (it, extra) => Object.assign({ topic: it[1], intent: it[0] }, it[4](), extra || {});
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
      const STOP = ' o a os as de da do das dos e em no na nos nas um uma uns para pra por com que qual quais quanto quantos quantas como meu minha meus minhas eu tem ter tenho ja esta estao esse essa este isso voce me se mais muito ao aos sao foi ser onde quando qualquer algum alguma posso faco fazer sobre ';
      const clean = (x) => unaccent(x.toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.includes(' ' + w + ' '));
      const mine = clean(t);
      const score = (it, slack) => {
        let n = 0;
        for (const kw of it[3].split(' ')) n += hit(kw, slack) * (kw.length >= 5 ? 2 : 1);
        // Perguntas prontas: igual a uma delas vale muito; palavras em comum valem pouco.
        const qs = [it[2]].concat((Orb.COSMO_QS[it[0]] || '').split('|').filter(Boolean));
        let best = 0;
        for (const x of qs) {
          const ws = clean(x);
          if (ws.join(' ') === mine.join(' ') && ws.length) { best = 10; break; }
          const common = mine.filter((w) => w.length > 3 && ws.some((v) => v.startsWith(w.slice(0, 6)) || w.startsWith(v.slice(0, 6)))).length;
          best = Math.max(best, common * (ws.length && common / ws.length >= 0.75 ? 1.5 : 0.75));
        }
        return n + best;
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

    // Resultados: histórico mensal de receita fechada e de conversão.
    // shortcut: o histórico sai determinístico dos totais do seed (barras do painel e receita do mês); com backend, vem do banco.
    PALETTE: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'],
    SOURCES: ['Inbound · site', 'Indicação', 'Outbound', 'Evento', 'Inbound · webinar'],
    history(n = 12) {
      const o = O(), id = db.org, now = new Date();
      const seedOrg = SEED.orgs[id] || {};
      const clients = (o.clients || seedOrg.clients || o.companies.map((c) => [c[0], c[1]])).slice();
      if (!clients.length) clients.push(['Cliente avulso', 'Outros']);
      const sector = (co) => { const c = clients.find((x) => x[0] === co) || o.companies.find((x) => x[0] === co); return c ? c[1] : 'Outros'; };
      const sellers = o.people.filter((p) => p.role !== 'Suporte' && p.role !== 'Leitor');
      const seller = (i) => Orb.person(i).n;
      const T = Orb.totals();
      const bars = o.bars || [];
      const avg = o.k.wonCount ? o.k.wonBase / o.k.wonCount : 25000;
      const pct = (t) => { const m = String(t || '').replace('−', '-').match(/-?\d+(?:,\d+)?/); return m ? Number(m[0].replace(',', '.')) / 100 : 0; };
      const conv = pct(o.k.conv), convPrev = conv - pct(o.k.convDelta);
      const out = [];
      for (let back = n - 1; back >= 0; back--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const key = dt.getFullYear() + '-' + pad(dt.getMonth() + 1);
        const rnd = rng(id + ':' + key);
        const days = back === 0 ? now.getDate() : new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        let total;
        if (back === 0) total = T.won;
        else if (back <= bars.length) total = bars[bars.length - back] * 1000;
        else total = Math.round((bars[0] || 0) * 1000 * Math.pow(0.95, back - bars.length) * (0.92 + rnd() * 0.12) / 100) * 100;
        const deals = [];
        let rest = total, count;
        if (back === 0) {
          // Mês atual: negócios ganhos de verdade nesta demonstração, as vitórias do feed e o restante da base.
          o.deals.filter((d) => d.status === 'won').forEach((d) => { deals.push({ co: d.co, v: d.v, o: d.o, src: d.src, seg: sector(d.co), day: new Date(d.closedAt || Date.now()).getDate(), real: true }); });
          rest = o.k.wonBase;
          (seedOrg.feed || []).forEach((f) => { const m = f.ini !== 'CA' && f.what.match(/^ganhou (.+) · R\$ ([\d.]+)/); if (m && Number(m[2].replace(/\./g, '')) < rest) { const v = Number(m[2].replace(/\./g, '')); deals.push({ co: m[1], v, o: f.ini, src: Orb.SOURCES[Math.floor(rnd() * 5)], seg: sector(m[1]), day: Math.max(1, days - 1) }); rest -= v; } });
          count = Math.max(rest > 0 ? 1 : 0, o.k.wonCount - deals.filter((d) => !d.real).length);
        } else count = rest > 0 ? Math.max(3, Math.round(total / avg * (0.85 + rnd() * 0.3))) : 0;
        // Divide um valor em negócios de tamanhos variados, com clientes sem repetir no mês enquanto der.
        const order = clients.map((c, i) => [rnd(), i]).sort((x, y) => x[0] - y[0]).map((x) => clients[x[1]]);
        let used = 0;
        const split = (amount, n, owner) => {
          if (n <= 0 || amount <= 0) return;
          const w = Array.from({ length: n }, () => 0.35 + Math.pow(rnd(), 1.6) * 2);
          const sum = w.reduce((x, y) => x + y, 0);
          let left = amount;
          w.forEach((x, i) => {
            const v = i === n - 1 ? left : Math.max(100, Math.round(amount * x / sum / 100) * 100);
            left -= v;
            const c = order[used++ % order.length];
            const pool = owner === null && back === 0 ? sellers.filter((p) => p.i !== 'CA') : sellers;
            const who = owner || (pool.length ? pool[Math.floor(rnd() * pool.length)].i : 'CA');
            deals.push({ co: c[0], v, o: who, src: Orb.SOURCES[Math.floor(rnd() * 5)], seg: c[1], day: 1 + Math.floor(rnd() * days) });
          });
        };
        if (back === 0 && count > 0 && rest > 0) {
          // A sua parte do mês é a mesma de Metas (receita fechada por você); o resto fica com o time.
          const mine = Math.min(o.me.won || 0, rest);
          const myN = mine ? Math.min(count - (rest > mine ? 1 : 0), Math.max(1, Math.round(mine / avg))) : 0;
          split(mine, myN, 'CA');
          split(rest - mine, count - myN, sellers.filter((p) => p.i !== 'CA').length ? null : 'CA');
        } else split(rest, count, null);
        deals.forEach((d) => { d.who = seller(d.o); });
        deals.sort((a, b) => b.v - a.v);
        let rate = back === 0 ? conv : back === 1 ? convPrev : 0;
        out.push({ key, back, y: dt.getFullYear(), mi: dt.getMonth(), m: MONTHS[dt.getMonth()], short: MONTHS[dt.getMonth()].slice(0, 3), days, total: deals.reduce((a, d) => a + d.v, 0), deals, rate, rnd });
      }
      // Conversão mensal: os dois últimos meses vêm do seed (taxa e variação); os anteriores variam pouco em volta deles.
      for (let i = out.length - 3; i >= 0; i--) { const r = out[i].rnd; out[i].rate = Math.min(0.45, Math.max(0.06, out[i + 1].rate - (r() - 0.45) * 0.03)); }
      const SHARE = [0.34, 0.14, 0.3, 0.12, 0.1];
      out.forEach((mo) => {
        const wins = mo.deals.length;
        mo.leads = mo.rate > 0 ? Math.max(wins, Math.round(wins / mo.rate)) : wins;
        mo.bySrc = Orb.SOURCES.map((src, i) => { const w = mo.deals.filter((d) => d.src === src).length; return { src, wins: w, leads: Math.max(w, Math.round(mo.leads * SHARE[i])) }; });
        delete mo.rnd;
      });
      return out;
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
      if (Orb.afterRender) Orb.afterRender();
      if (db.toast) { const t = db.toast; db.toast = null; Orb.save(); setTimeout(() => Orb.flash(c, t)); }
      const s = c.state;
      const IC = { dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', pipe: 'M3 4h18l-7 8.5V19l-4 2v-8.5z', cont: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', task: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', sup: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z', goal: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3', team: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', plan: 'M2 5h20v14H2zM2 10h20M6 15h4', chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', wpp: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', org: 'M3 21h18M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 9h3a1 1 0 0 1 1 1v11M9 7h2M9 11h2M9 15h2', cosmo: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M17 5h4', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', chart: 'M3 3v18h18M8 16v-5M13 16V8M18 16V5' };
      const pending = Orb.tasksPending();
      const NAV = [['Main.dc.html', 'Painel', 'dash'], ['Resultados.dc.html', 'Resultados', 'chart'], ['Conversas.dc.html', 'Conversas', 'chat'], ['Contatos.dc.html', 'Contatos', 'cont'], ['Pipeline.dc.html', 'Funil de vendas', 'pipe', String(Orb.totals().count)], ['Tarefas.dc.html', 'Tarefas', 'task', pending ? String(pending) : ''], ['Cosmo.dc.html', 'Respostas do Cosmo', 'cosmo'], ['Instancias.dc.html', 'Instâncias WhatsApp', 'wpp'], ['Metas.dc.html', 'Metas e conquistas', 'goal'], ['Organizacoes.dc.html', 'Organizações', 'org'], ['Equipe.dc.html', 'Equipe e permissões', 'team'], ['Planos.dc.html', 'Planos e pagamentos', 'plan'], ['Perfil.dc.html', 'Meu perfil', 'user'], ['Suporte.dc.html', 'Suporte interno', 'sup', String(Orb.ticketsOpen())]];
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
        tabs: links.slice(0, 5).map((n) => Object.assign({}, n, { cls: n.href === cur ? 'tab on' : 'tab glass', short: SHORT[n.href] || n.label })),
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
          <a class="btn ghost sm" href="Organizacao.dc.html" style="justify-content:flex-start">Perfil da organização</a>
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

  // Movimento: entrada em onda, números subindo do zero, barras, anéis e linhas se construindo,
  // e a pílula das abas deslizando entre as opções. A opção "Animações de interface" do perfil desliga tudo.
  const Motion = (() => {
    const html = document.documentElement;
    // Quem decide é a opção "Animações de interface" do perfil (ligada por padrão). O ajuste de animações do
    // sistema não desliga mais tudo: no Windows ele vem desligado em muitos computadores, e o site ficava parado.
    const reduce = () => html.classList.contains('no-motion');
    const EASE = 'cubic-bezier(.16,1,.3,1)';
    const WAVE = 'cubic-bezier(.34,1.32,.64,1)';
    const NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
    const KINDS = [
      ['w', '.bar > i, [data-grow="x"]'],
      ['h', '[data-grow="y"]'],
      ['ring', 'circle.ring-val, circle[stroke-linecap="round"][stroke-dasharray]'],
      ['draw', 'polyline.line, polyline.spark, [data-draw]'],
      ['fade', 'polygon.area, [data-fade]'],
      ['pop', '[data-pop]'],
      ['count', '.kpi, [data-count], svg[role="img"] text:not(.axis)']
    ];
    const seen = new WeakSet(), last = new WeakMap(), scenes = new WeakMap(), pills = new WeakMap();
    const running = new WeakMap();
    let queued = false;
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const job = e.target._motion;
        if (!job) return;
        e.target._motion = null;
        const d = waveDelay(e.target, 0);
        if (job.kind === 'count') { if (job.node.nodeValue === job.zero) job.node.nodeValue = job.final; countUp(e.target, null, d); }
        else if (job.anim) { job.anim.effect.updateTiming({ delay: d }); job.anim.play(); }
      });
    }) : null;

    const target = (el, kind) => {
      if (kind === 'w') return el.style.width;
      if (kind === 'h') return el.style.height;
      if (kind === 'ring') return el.getAttribute('stroke-dasharray') || '';
      if (kind === 'count') { const t = textNode(el); return t ? canonical(t) : ''; }
      if (kind === 'draw') return el.getAttribute('points') || el.getAttribute('d') || '';
      return '1';
    };
    const textNode = (el) => [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue));
    // Atraso em onda: cresce na diagonal da tela, então a página "acorda" de cima para baixo e da esquerda para a direita.
    const waveDelay = (el, i) => { const r = el.getBoundingClientRect(); const y = Math.max(0, Math.min(r.top, innerHeight)) / innerHeight, x = Math.max(0, r.left) / innerWidth; return Math.round(90 + y * 380 + x * 220 + (i || 0) * 55); };
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && (r.width || r.height); };

    function stop(el) { const a = running.get(el); if (a) { a.forEach((x) => x.cancel && x.cancel()); running.delete(el); } }
    function keep(el, anim) { const list = running.get(el) || []; list.push(anim); running.set(el, list); if (anim.finished) anim.finished.then(() => running.delete(el), () => {}); }

    // Contagem: cada nó de texto guarda o valor final verdadeiro enquanto conta, para uma nova contagem
    // (ex.: trocar de mês no meio da animação) nunca tomar um número intermediário como destino.
    const loops = new WeakMap();
    const canonical = (node) => { const st = loops.get(node); return st && !st.done && node.nodeValue === st.written ? st.final : node.nodeValue; };
    function countUp(el, from, delay) {
      const node = textNode(el);
      if (!node) return;
      const final = canonical(node);
      const tokens = [...final.matchAll(NUM)].map((m) => ({ s: m.index, e: m.index + m[0].length, v: Number(m[0].replace(/\./g, '').replace(',', '.')), dec: (m[0].split(',')[1] || '').length, grp: m[0].includes('.') }));
      if (!tokens.length) return;
      let starts = tokens.map(() => 0);
      if (from != null) { const p = [...String(from).matchAll(NUM)]; if (p.length !== tokens.length) return; starts = p.map((m) => Number(m[0].replace(/\./g, '').replace(',', '.'))); if (starts.every((v, i) => v === tokens[i].v)) return; }
      const fmt = (p) => { let out = final; for (let i = tokens.length - 1; i >= 0; i--) { const t = tokens[i]; const v = starts[i] + (t.v - starts[i]) * p; out = out.slice(0, t.s) + v.toLocaleString('pt-BR', { minimumFractionDigits: t.dec, maximumFractionDigits: t.dec, useGrouping: t.grp }) + out.slice(t.e); } return out; };
      const old = loops.get(node);
      if (old) old.dead = true;
      const st = { final, written: fmt(0), dead: false, done: false };
      loops.set(node, st);
      node.nodeValue = st.written;
      const dur = 1100, t0 = performance.now() + delay;
      const tick = (now) => {
        if (st.dead) return;
        if (node.nodeValue !== st.written && node.nodeValue !== final) { st.done = true; return; } // a tela mudou o valor: para aqui
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        st.written = p >= 1 ? final : fmt(1 - Math.pow(1 - p, 4));
        node.nodeValue = st.written;
        if (p < 1) requestAnimationFrame(tick); else st.done = true;
      };
      requestAnimationFrame(tick);
    }

    // Anima um elemento: do zero (prev null) ou do valor anterior até o atual.
    function run(el, kind, prev, delay) {
      stop(el);
      const opt = { duration: 900, delay, easing: EASE, fill: 'backwards' };
      let a = null;
      if (kind === 'count') return countUp(el, prev, delay);
      if (kind === 'w') a = el.animate([{ width: prev || '0%' }, { width: el.style.width || '100%' }], Object.assign(opt, { duration: 1000 }));
      else if (kind === 'h') a = prev ? el.animate([{ height: prev }, { height: el.style.height }], opt) : el.animate([{ transform: 'scaleY(0)', transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', transformOrigin: '50% 100%' }], Object.assign(opt, { easing: WAVE, duration: 950 }));
      else if (kind === 'ring') { const to = el.getAttribute('stroke-dasharray') || ''; const gap = (to.split(/[\s,]+/)[1]) || '1000'; a = el.animate([{ strokeDasharray: prev || '0 ' + gap }, { strokeDasharray: to }], Object.assign(opt, { duration: 1300 })); }
      else if (kind === 'draw') { if (!el.getTotalLength) return; const L = Math.ceil(el.getTotalLength()) + 1; a = el.animate([{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], Object.assign(opt, { duration: 1200, easing: 'cubic-bezier(.65,0,.35,1)' })); }
      else if (kind === 'fade') a = el.animate([{ opacity: 0 }, { opacity: 1 }], Object.assign(opt, { delay: delay + 350, duration: 800 }));
      else if (kind === 'pop') a = el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], Object.assign(opt, { easing: WAVE, duration: 600, delay: delay + 500 }));
      if (a) keep(el, a);
      return a;
    }

    // Reentrada em onda dos cartões de uma área que acabou de mudar (ex.: Individual ↔ equipe).
    function rewave(scope, skip) {
      const cards = [...scope.querySelectorAll('.glass, [data-wave]')].filter((c) => !(skip && (c.contains(skip) || skip.contains(c))) && inView(c));
      cards.forEach((c, i) => { stop(c); keep(c, c.animate([{ opacity: 0, transform: 'translateY(14px) scale(.985)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 650, delay: i * 45, easing: EASE, fill: 'backwards' })); });
    }
    function replay(scope, skip) {
      if (!scope || reduce()) return;
      KINDS.forEach(([kind, sel]) => [...scope.querySelectorAll(sel)].forEach((el, i) => { if (skip && skip.contains(el)) return; last.set(el, target(el, kind)); if (inView(el)) run(el, kind, null, 80 + i * 45); }));
      rewave(scope, skip);
    }

    // Pílula: um clone das opções em cor invertida, recortado no formato da pílula, desliza da opção antiga à nova.
    // A borda da frente sai primeiro e a de trás alcança depois, como no vídeo de referência.
    function rel(box, el) { const b = box.getBoundingClientRect(), r = el.getBoundingClientRect(); return { l: r.left - b.left + box.scrollLeft, t: r.top - b.top + box.scrollTop, w: r.width, h: r.height }; }
    function glide(box, from, to, done) {
      if (reduce() || !from || !to) { if (done) done(); return; }
      box.querySelectorAll(':scope > .pill-ghost').forEach((x) => x.remove());
      // Largura fracionária (getBoundingClientRect): arredondar para baixo faria o texto da última opção quebrar no clone.
      const bb = box.getBoundingClientRect();
      const W = Math.max(bb.width, box.scrollWidth + box.clientLeft * 2), H = Math.max(bb.height, box.scrollHeight + box.clientTop * 2);
      const ghost = box.cloneNode(true);
      ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
      ghost.classList.add('pill-ghost');
      Object.assign(ghost.style, { left: -box.clientLeft + 'px', top: -box.clientTop + 'px', width: W + 'px', height: H + 'px' });
      const lerp = (a, b, k) => a + (b - a) * k;
      const fr = { l: from.l, t: from.t, r: from.l + from.w, b: from.t + from.h }, tr = { l: to.l, t: to.t, r: to.l + to.w, b: to.t + to.h };
      const right = tr.l > fr.l, down = tr.t > fr.t;
      const mid = { l: lerp(fr.l, tr.l, right ? 0.15 : 0.9), r: lerp(fr.r, tr.r, right ? 0.9 : 0.15), t: lerp(fr.t, tr.t, down ? 0.15 : 0.9), b: lerp(fr.b, tr.b, down ? 0.9 : 0.15) };
      const clip = (q) => 'inset(' + q.t + 'px ' + (W - q.r) + 'px ' + (H - q.b) + 'px ' + q.l + 'px round 999px)';
      box.classList.add('pill-run');
      box.appendChild(ghost);
      const a = ghost.animate([{ clipPath: clip(fr) }, { clipPath: clip(mid), offset: 0.45 }, { clipPath: clip(tr) }], { duration: 440, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
      // A opção real reaparece por baixo do clone (que ainda a cobre) e só depois o clone sai: sem piscar.
      const end = () => { box.classList.remove('pill-run'); setTimeout(() => ghost.remove(), 260); if (done) done(); };
      a.finished.then(end, end);
    }
    function pillGroups(root) {
      [...root.querySelectorAll('.seg, .scheme, .tabs, .rail, [data-pill]')].forEach((box) => {
        const items = [...box.children].filter((c) => !c.classList.contains('pill-ghost'));
        const idx = items.findIndex((c) => c.classList.contains('on'));
        const prev = pills.get(box);
        const now = idx >= 0 ? rel(box, items[idx]) : null;
        pills.set(box, { idx, rect: now });
        if (!prev || prev.idx === idx || prev.idx < 0 || idx < 0) return;
        glide(box, prev.rect, now);
        // Trocar de opção num grupo é entrar numa área nova: tudo nela se constrói de novo.
        if (box.matches('.seg, .scheme, [data-pill]')) {
          const main = document.querySelector('.main');
          const scope = box.dataset.scope === 'main' || box.closest('header.top') ? main : box.closest('section, [data-scope-root]') || main;
          setTimeout(() => replay(scope, box.closest('header.top') || box), 0);
        }
      });
    }

    function scan() {
      queued = false;
      const off = reduce();
      // Áreas marcadas com data-scene: quando o valor muda (outro mês, outra visão), tudo nelas recomeça do zero.
      [...document.querySelectorAll('[data-scene]')].forEach((el) => { const v = el.getAttribute('data-scene'); const p = scenes.get(el); scenes.set(el, v); if (p !== undefined && p !== v && !off) setTimeout(() => replay(el), 0); });
      KINDS.forEach(([kind, sel]) => {
        [...document.querySelectorAll(sel)].forEach((el, i) => {
          if (el.closest('.pill-ghost')) return;
          const tgt = target(el, kind);
          if (!seen.has(el)) {
            seen.add(el); last.set(el, tgt);
            if (off) return;
            if (inView(el)) run(el, kind, null, waveDelay(el, kind === 'h' || kind === 'pop' ? i % 14 : 0));
            else if (io) {
              // Fora da tela: fica parado no zero e só se constrói quando aparecer na rolagem.
              if (kind === 'count') { const t = textNode(el); if (!t) return; const zero = t.nodeValue.replace(NUM, (m) => (m.includes(',') ? '0,' + '0'.repeat(m.split(',')[1].length) : '0')); el._motion = { kind, node: t, final: t.nodeValue, zero }; t.nodeValue = zero; }
              else { const anim = run(el, kind, null, 0); if (!anim) return; anim.pause(); el._motion = { kind, anim }; }
              io.observe(el);
            }
            return;
          }
          const prev = last.get(el);
          if (prev !== tgt) { last.set(el, tgt); if (!off && kind !== 'draw' && kind !== 'fade' && kind !== 'pop') run(el, kind, prev, 0); }
        });
      });
      pillGroups(document);
    }

    return {
      schedule() { if (queued) return; queued = true; requestAnimationFrame(scan); },
      rel, glide, reduce
    };
  })();
  Orb.afterRender = () => Motion.schedule();

  const html = document.documentElement;
  // Troca de aba: a pílula desliza até a aba clicada, o conteúdo sai desfocando e a próxima tela entra em onda.
  let leaving = false;
  const swaps = [];
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !/\.dc\.html$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (Motion.reduce()) return;
    e.preventDefault();
    leaving = true;
    const file = url.pathname.split('/').pop();
    let wait = 230;
    document.querySelectorAll('.tabs, .rail').forEach((box) => {
      const items = [...box.children].filter((c) => !c.classList.contains('pill-ghost'));
      const on = items.find((c) => c.classList.contains('on'));
      const to = items.find((c) => c.getAttribute && (c.getAttribute('href') || '').split(/[?#]/)[0] === file);
      if (on && to && on !== to) { Motion.glide(box, Motion.rel(box, on), Motion.rel(box, to)); swaps.push([on, to, on.className, to.className]); to.classList.add('on'); on.classList.remove('on'); if (on.classList.contains('tab')) { on.classList.add('glass'); to.classList.remove('glass'); } wait = 380; }
    });
    html.classList.add('leaving');
    setTimeout(() => { location.href = url.href; }, wait);
  }, true);
  // Voltar pelo histórico reaproveita a página congelada: limpa o estado de saída.
  g.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    html.classList.remove('leaving');
    swaps.splice(0).forEach(([on, to, onCls, toCls]) => { on.className = onCls; to.className = toCls; });
    document.querySelectorAll('.pill-ghost').forEach((x) => x.remove());
    document.querySelectorAll('.pill-run').forEach((x) => x.classList.remove('pill-run'));
  });

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
