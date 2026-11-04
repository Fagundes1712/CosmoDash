// Regras, persistência e menu lateral compartilhados pelas 9 telas.
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

    // Cosmo: respostas por regras sobre os dados da organização; o modelo de IA entra com o backend.
    cosmo(q) {
      const lim = Orb.plan().limits.cosmo;
      if (q.count !== false && lim !== null && O().usage.cosmo >= lim) return { title: 'Limite do plano', text: 'As ' + Orb.num(lim) + ' consultas do Cosmo deste mês acabaram.', href: 'Planos.dc.html', cta: 'Ver planos', hasLink: true };
      if (q.count !== false) { O().usage.cosmo++; Orb.save(); }
      const t = unaccent((q.text || '').toLowerCase());
      const s = Orb.totals();
      const list = (ds) => ds.map((d) => d.co + ' (' + Orb.mil(d.v) + ', ' + SEED.stages[d.st] + ', ' + d.d + ' dias)').join(', ');
      const has = (...w) => w.some((x) => t.includes(x));
      const person = O().contacts.find((c) => t.split(/[^a-z]+/).some((w) => w.length > 2 && unaccent(c.name.toLowerCase()).split(' ').includes(w)));
      if (q.id === 'risco' || (!q.id && has('risco', 'parad'))) {
        const sum = s.risk.reduce((a, d) => a + d.v, 0);
        return s.risk.length ? { title: 'Negócios em risco', text: (s.risk.length === 1 ? '1 negócio está' : s.risk.length + ' negócios estão') + ' sem interação há 10 dias ou mais e ' + (s.risk.length === 1 ? 'soma ' : 'somam ') + Orb.mil(sum) + ': ' + list(s.risk) + '. Sugiro um follow-up hoje.', href: 'Pipeline.dc.html?filter=risk', cta: 'Abrir funil', hasLink: true } : { title: 'Negócios em risco', text: 'Nenhum negócio parado há 10 dias ou mais.', href: 'Pipeline.dc.html', cta: 'Abrir funil', hasLink: true };
      }
      if (q.id === 'semana' || (!q.id && has('seman', 'resumo'))) {
        const k = O().k;
        const wins = O().deals.filter((d) => d.status === 'won' && Date.now() - d.closedAt < 7 * DAY);
        return { title: 'Resumo da semana', text: Orb.pl(k.weekWon + wins.length, 'negócio ganho', 'negócios ganhos') + ' (' + Orb.mil(k.weekVal + wins.reduce((a, d) => a + d.v, 0)) + '), ' + (k.weekActs + Orb.counted('activity')) + ' atividades registradas e 1ª resposta média a leads de ' + k.leadReply + '. Você está em ' + Orb.myRank() + 'º no ranking.', href: 'Metas.dc.html', cta: 'Ver metas', hasLink: true };
      }
      if (q.id === 'sup' || (!q.id && has('suporte', 'ticket'))) {
        const urgent = O().tickets.filter((x) => x.status === 'open' && Orb.slaInfo(x).min < 60);
        return { title: 'Suporte', text: Orb.pl(Orb.ticketsOpen(), 'ticket aberto', 'tickets abertos') + (urgent.length ? ', ' + urgent.length + ' com SLA vencendo em menos de 1 hora (' + urgent.map((x) => x.id + ' de ' + x.org.split(' · ')[0]).join(', ') + ').' : ', nenhum com SLA vencendo em menos de 1 hora.'), href: 'Suporte.dc.html', cta: 'Abrir fila', hasLink: true };
      }
      if (q.id === 'prev' || (!q.id && has('previs', 'meta', 'fechamento', 'mes'))) {
        const missing = O().k.goal - s.won;
        const closing = Orb.openDeals().filter((d) => d.st === 4).sort((a, b) => b.v - a.v);
        const left = Orb.daysLeftInMonth();
        const when = left === 0 ? 'O mês fecha hoje' : 'Faltam ' + left + ' dias para fechar o mês';
        const res = { title: 'Fechamento de ' + Orb.monthName(), href: 'Pipeline.dc.html', cta: 'Priorizar no funil', hasLink: true };
        if (missing <= 0) return Object.assign(res, { text: 'Meta batida: ' + Orb.brl(s.won) + ' de ' + Orb.brl(O().k.goal) + '.' });
        let acc = 0; const need = [];
        for (const d of closing) { if (acc >= missing) break; acc += d.v; need.push(d.co); }
        const tail = acc >= missing ? ' Fechar ' + need.join(' e ') + ' já bate a meta.' : ' Mesmo fechando todos, a meta não é atingida.';
        return Object.assign(res, { text: when + ' e faltam ' + Orb.brl(missing) + ' para a meta. Em Fechamento há ' + Orb.pl(closing.length, 'negócio', 'negócios') + ' somando ' + Orb.mil(closing.reduce((a, d) => a + d.v, 0)) + '.' + tail });
      }
      if (person) return { title: person.name, text: person.role + ' em ' + person.co + '. E-mail ' + person.email + (person.phone ? ', telefone ' + person.phone : '') + '. Último contato há ' + person.days + ' dias.', href: 'Contatos.dc.html?c=' + person.id, cta: 'Abrir ficha', hasLink: true };
      return { title: 'Não entendi', text: 'Por enquanto respondo sobre negócios em risco, previsão do mês, resumo da semana, suporte e dados de um contato pelo nome.', href: '', cta: '', hasLink: false };
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
      const IC = { dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', pipe: 'M3 4h18l-7 8.5V19l-4 2v-8.5z', cont: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', task: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', sup: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z', goal: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3', team: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', plan: 'M2 5h20v14H2zM2 10h20M6 15h4' };
      const pending = Orb.tasksPending();
      const NAV = [['Comercial'], ['Main.dc.html', 'Dashboard', 'dash'], ['Pipeline.dc.html', 'Funis de vendas', 'pipe', String(Orb.totals().count)], ['Contatos.dc.html', 'Contatos', 'cont'], ['Tarefas.dc.html', 'Tarefas', 'task', pending ? String(pending) : ''], ['Atendimento'], ['Suporte.dc.html', 'Suporte interno', 'sup', String(Orb.ticketsOpen())], ['Performance'], ['Metas.dc.html', 'Metas & conquistas', 'goal'], ['Administração'], ['Equipe.dc.html', 'Equipe & acessos', 'team'], ['Planos.dc.html', 'Planos & pagamentos', 'plan']];
      const nav = NAV.map((a) => (a.length === 1 ? { head: true, link: false, label: a[0] } : { head: false, link: true, href: a[0], label: a[1], d: IC[a[2]], badge: a[3] || '', hasBadge: !!a[3], cls: a[0] === cur ? 'nav on' : 'nav' }));
      const links = nav.filter((n) => n.link);
      const SHORT = { 'Main.dc.html': 'Início', 'Pipeline.dc.html': 'Funis' };
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
        profCls: cur === 'Perfil.dc.html' ? 'rail-btn on' : 'rail-btn', xpTier: 'Nível ' + lv.lvl + ' · ' + lv.tier, xpNext: lv.lvl + 1,
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
    <a href="{{n.href}}" class="{{n.cls}}" aria-label="{{n.label}}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="{{n.d}}"></path></svg><span class="tip">{{n.label}}</span><sc-if value="{{n.hasBadge}}"><span class="dot">{{n.badge}}</span></sc-if></a>
  </sc-for>
  <span class="rail-sep" aria-hidden="true"></span>
  <a href="Perfil.dc.html" class="{{profCls}}" aria-label="Meu perfil"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path></svg><span class="tip">Meu perfil</span></a>
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
          <a class="btn ghost sm" href="Equipe.dc.html?tab=o&new=1" style="justify-content:flex-start">+ Nova organização</a>
        </div>
      </sc-if>
    </div>
  </div>
  <nav class="tabs" aria-label="Comercial">
    <sc-for list="{{tabs}}" as="t"><a href="{{t.href}}" class="{{t.cls}}"><svg class="ico s" viewBox="0 0 24 24" aria-hidden="true"><path d="{{t.d}}"></path></svg><span class="lbl">{{t.short}}</span></a></sc-for>
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
