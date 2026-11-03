// Dados de demonstração. Datas são relativas ao primeiro carregamento (off = dias a partir de hoje).
(function () {
  const P = { CA: '#5FE0F0', ML: '#FF9A62', BK: '#ADA0FF', LR: '#5ADFA4', RT: '#FF7A8A', TN: '#F3D06E', DA: '#F3D06E', JP: '#5ADFA4' };
  const d = (id, co, v, st, o, c, r, days, src, f) => ({ id, co, v, st, o, c, r, d: days, src, f: f || 'b2b', status: 'open', log: [], act: false });
  const m = (i, n, e, sq, lv, last, tfa, c, role, season) => ({ i, n, e, sq, lv, last, tfa, c, role, season });
  const k = (id, name, role, co, days, p, o, tags, tip, stage) => ({ id, name, role, co, days, p, o, tags, tip, stage: stage || '', seed: true, tl: [] });
  const t = (id, off, h, title, ctx, type, xp, done, hi) => ({ id, off, h, t: title, ctx, type, xp, done: !!done, seedDone: !!done, hi: !!hi });
  const n = (id, text, href, unread) => ({ id, text, href, unread: unread !== false });

  const ORB_SEED = {
    colors: P,
    roles: ['Admin', 'Gestor', 'Vendedor', 'Suporte', 'Leitor'],
    stages: ['Prospecção', 'Qualificação', 'Proposta', 'Negociação', 'Fechamento'],
    probs: [0.1, 0.25, 0.5, 0.7, 0.9],
    plans: {
      starter: { n: 'Starter', p: 49, rank: 0, c: '#9AADC1', d: 'Para começar a organizar vendas', seats: 'até 3 usuários', limits: { seats: 3, contacts: 2000, cosmo: 200, storage: 5, funnels: 1 }, f: ['1 funil de vendas', '2.000 contatos', '5 GB de armazenamento', 'Tarefas, missões diárias e níveis', 'Cosmo: 200 consultas por mês'] },
      pro: { n: 'Pro', p: 99, rank: 1, c: '#5FE0F0', d: 'Para times comerciais em crescimento', seats: 'até 10 usuários', limits: { seats: 10, contacts: 10000, cosmo: 1000, storage: 20, funnels: null }, f: ['Funis ilimitados', '10.000 contatos', '20 GB de armazenamento', 'Suporte interno com SLA e gamificação completa', 'Cosmo: 1.000 consultas por mês'] },
      business: { n: 'Business', p: 169, rank: 2, c: '#FF9A62', d: 'Para operações com várias equipes', seats: 'usuários ilimitados', limits: { seats: null, contacts: null, cosmo: null, storage: 100, funnels: null }, f: ['Tudo do Pro, sem limites de usuários e contatos', '100 GB de armazenamento', 'Permissões personalizadas e log de auditoria', 'Múltiplas organizações com cobrança unificada', 'Cosmo ilimitado com previsão de receita'] }
    },
    permissions: [['all', 'Ver todos os negócios', 'Sem isso, vê só os próprios'], ['edit', 'Editar negócios de outros', 'Mover etapa, valor e dono'], ['del', 'Excluir registros', 'Contatos e negócios'], ['exp', 'Exportar dados', 'CSV e relatórios completos'], ['pipe', 'Gerenciar funis', 'Criar novos funis'], ['users', 'Gerenciar usuários', 'Convidar, remover e mudar papéis'], ['bill', 'Plano e cobrança', 'Faturas e forma de pagamento'], ['game', 'Configurar gamificação', 'Metas, desafios e recompensas'], ['sup', 'Atender tickets', 'Responder e resolver no suporte']],
    perms: { all: [1, 1, 0, 1, 1], edit: [1, 1, 0, 0, 0], del: [1, 0, 0, 0, 0], exp: [1, 1, 0, 0, 0], pipe: [1, 1, 0, 0, 0], users: [1, 0, 0, 0, 0], bill: [1, 0, 0, 0, 0], game: [1, 1, 0, 0, 0], sup: [1, 1, 1, 1, 0] },
    profile: { name: 'Cauã Augusto', title: 'Head de Novos Negócios', email: 'caua@verticelabs.com.br', phone: '', tz: 'America/Sao_Paulo', lang: 'pt', sig: 'Cauã Augusto\nHead de Novos Negócios', photo: '', goal: 8,
      prefs: { cosmo: true, compact: false, motion: true, showLvl: true, peers: true },
      notif: { won: [1, 1, 0], risk: [1, 1, 1], tk: [1, 0, 0], ach: [1, 0, 0], dig: [0, 1, 0] },
      sessions: [{ id: 1, d: 'Chrome · Windows', w: 'São Paulo · agora', cur: true }, { id: 2, d: 'Safari · iPhone', w: 'São Paulo · há 2 h', cur: false }] },
    orgs: {
      v: {
        name: 'Vértice Labs', mark: 'VL', color: '#5FE0F0', role: 'Admin', plan: 'pro', cycle: 'm', pay: 'c', cardLabel: 'Visa •••• 7316',
        me: { lvl: 14, xp: 2340, season: 7960, streak: 6, squad: 'Squad Ômega', won: 118400, goalWon: 150000, created: 14, createdGoal: 20, acts: 186, actsGoal: 220 },
        k: { wonBase: 412380, wonCount: 15, goal: 500000, delta: '+11,2%', conv: '24,6%', convDelta: '+2,1 pp', up: true, sla: '94%', first: '38 min', csat: '4,7', spark: '0,30 33,28 66,29 100,22 133,20 166,14 200,8', cycleDays: 18, weekWon: 4, weekVal: 118000, weekActs: 37, leadReply: '11 min' },
        bars: [268, 301, 287, 344, 371],
        funnels: [{ id: 'b2b', name: 'Vendas B2B' }, { id: 'exp', name: 'Expansão de contas' }],
        hid: { b2b: [[8, 109500], [6, 88000], [3, 141000], [2, 83000], [0, 0]] },
        deals: [
          d('orla', 'Orla Hotéis', 22000, 0, 'RT', 'Paula Siqueira', 'Dir. de Operações', 2, 'Inbound · site'), d('grao', 'Grão Café', 9500, 0, 'TN', 'Rodrigo Pires', 'Sócio', 4, 'Indicação'), d('meri', 'Meridian Seguros', 31000, 0, 'RT', 'Carla Menezes', 'Head de TI', 1, 'Outbound'), d('tece', 'Tecelagem Sul', 14000, 0, 'TN', 'Joel Bastos', 'Gerente Comercial', 6, 'Evento'),
          d('vitta', 'Vitta Farma', 42000, 1, 'BK', 'Renata Alves', 'CFO', 3, 'Inbound · webinar'), d('puls', 'Rede Pulsar', 26000, 1, 'LR', 'Igor Matos', 'Diretor', 5, 'Indicação'), d('aria', 'Banco Ária', 58000, 1, 'ML', 'Sofia Lemos', 'VP Digital', 2, 'Outbound'),
          d('ferraz', 'Ferraz Logística', 31000, 2, 'CA', 'André Ferraz', 'CEO', 11, 'Inbound · site'), d('viva', 'Clínica Viva', 17000, 2, 'LR', 'Dra. Paula Reis', 'Sócia', 14, 'Indicação'), d('hori', 'Horizonte Educação', 64000, 2, 'BK', 'Marcos Leal', 'Dir. Acadêmico', 4, 'Evento'), d('kaete', 'Kaeté Bebidas', 45000, 2, 'ML', 'Tânia Rocha', 'Gerente de Marketing', 3, 'Outbound'),
          d('lumen', 'Grupo Lumen', 48000, 3, 'CA', 'Helena Duarte', 'Dir. Comercial', 12, 'Inbound · site'), d('polo', 'Polo Têxtil', 71000, 3, 'ML', 'Ricardo Nunes', 'CEO', 5, 'Indicação'), d('navi', 'Navi Telecom', 39000, 3, 'BK', 'Fernanda Luz', 'Compras', 2, 'Outbound'),
          d('atlas', 'Atlas Engenharia', 62000, 4, 'CA', 'Bruno Atlas', 'Sócio-diretor', 3, 'Evento'), d('patio', 'Pátio Digital', 38000, 4, 'LR', 'Nina Castro', 'COO', 2, 'Inbound · site'), d('nobre', 'Nobre Alimentos', 32000, 4, 'BK', 'Otávio Nobre', 'Diretor', 1, 'Indicação')
        ],
        people: [
          m('CA', 'Cauã Augusto', 'caua@verticelabs.com.br', 'Squad Ômega', 14, 'agora', true, P.CA, 'Admin', 7960), m('ML', 'Marina Lopes', 'marina@verticelabs.com.br', 'Squad Alfa', 19, 'há 4 min', true, P.ML, 'Gestor', 9870), m('BK', 'Bianca Kato', 'bianca@verticelabs.com.br', 'Squad Alfa', 17, 'há 12 min', true, P.BK, 'Vendedor', 8420), m('LR', 'Lívia Ramos', 'livia@verticelabs.com.br', 'Squad Ômega', 15, 'há 1 h', true, P.LR, 'Vendedor', 7110),
          m('RT', 'Rafael Torres', 'rafael@verticelabs.com.br', 'Squad Alfa', 12, 'há 1 h', false, P.RT, 'Vendedor', 6530), m('TN', 'Thiago Nunes', 'thiago@verticelabs.com.br', 'Squad Ômega', 9, 'ontem', true, P.TN, 'Vendedor', 5240), m('DA', 'Diego Almeida', 'diego@verticelabs.com.br', 'Atendimento', 15, 'há 26 min', true, P.DA, 'Suporte', 6880), m('JP', 'Júlia Prado', 'julia@verticelabs.com.br', 'Atendimento', 13, 'há 3 min', true, P.JP, 'Suporte', 5760)
        ],
        hidMembers: 0,
        invites: [{ id: 1, e: 'pedro.sales@verticelabs.com.br', role: 'Vendedor', sq: 'Squad Alfa', sent: '29/10', exp: '5 dias' }],
        squads: ['Squad Alfa', 'Squad Ômega', 'Atendimento'],
        squad: { lvl: 9, pct: 64, won: 164300, goalWon: 200000, wins: 6, winsGoal: 8, resp: '9 min', respGoal: '15 min' },
        contactsBase: 1274,
        companies: [['Grupo Lumen', 'Varejo', 'Cliente', 'R$ 186 mil'], ['Solaris Energia', 'Energia', 'Cliente', 'R$ 54 mil'], ['Atlas Engenharia', 'Construção', 'Oportunidade', '—'], ['Polo Têxtil', 'Indústria', 'Oportunidade', '—'], ['Banco Ária', 'Financeiro', 'Oportunidade', '—'], ['Pátio Digital', 'Tecnologia', 'Oportunidade', '—'], ['Ferraz Logística', 'Logística', 'Oportunidade', '—'], ['Clínica Viva', 'Saúde', 'Oportunidade', '—']],
        contacts: [
          k('helena', 'Helena Duarte', 'Dir. Comercial', 'Grupo Lumen', 12, 42, 'CA', ['Cliente', 'Expansão'], 'Pulso caiu 18 pontos em 2 semanas: 12 dias sem contato e tickets abertos. Resolva o suporte antes de falar de preço.'),
          k('andre', 'André Ferraz', 'CEO', 'Ferraz Logística', 11, 51, 'CA', ['Decisor'], 'Abriu a proposta 3 vezes ontem e não respondeu. Bom momento para uma ligação curta.'),
          k('paula', 'Dra. Paula Reis', 'Sócia', 'Clínica Viva', 14, 38, 'LR', ['Saúde'], 'Maior tempo parado do funil. Ofereça uma demonstração com o caso de outra clínica.'),
          k('bruno', 'Bruno Atlas', 'Sócio-diretor', 'Atlas Engenharia', 3, 86, 'CA', ['Decisor', 'Evento'], 'Contrato com o jurídico deles desde quinta. Pergunte se falta alguma cláusula.'),
          k('nina', 'Nina Castro', 'COO', 'Pátio Digital', 2, 81, 'LR', ['Inbound'], 'Pediu início em breve. Confirme o onboarding com o time de suporte.'),
          k('renata', 'Renata Alves', 'CFO', 'Vitta Farma', 3, 67, 'BK', ['Financeiro'], 'Prioriza ROI: envie a calculadora de retorno antes da reunião.'),
          k('sofia', 'Sofia Lemos', 'VP Digital', 'Banco Ária', 2, 72, 'ML', ['Enterprise'], 'Exige revisão de segurança. Anexe o relatório de conformidade.'),
          k('ricardo', 'Ricardo Nunes', 'CEO', 'Polo Têxtil', 5, 74, 'ML', ['Indicação'], 'Maior negócio aberto. Pediu parcelamento em 6x.'),
          k('laura', 'Laura Brito', 'Gerente de Compras', 'Solaris Energia', 0, 92, 'BK', ['Cliente', 'Novo'], 'Cliente novo. Programe o check-in de 30 dias para garantir a adoção.', 'Cliente'),
          k('carla', 'Carla Menezes', 'Head de TI', 'Meridian Seguros', 1, 58, 'RT', ['Outbound'], 'Respondeu ao 2º e-mail da cadência. Agende o diagnóstico.')
        ],
        tasks: [
          t(1, 0, '09:00', 'Daily comercial', 'Squad Ômega · 15 min', 'Reunião', 5, true), t(2, 0, '09:30', 'Ligar para Bruno Atlas — status do contrato', 'Atlas Engenharia · Fechamento', 'Ligação', 10, true), t(3, 0, '11:00', 'Responder 4 leads novos do site', 'Fila de inbound · SLA 15 min', 'E-mail', 30, true, true), t(4, 0, '14:00', 'Reunião de descoberta com Rafael', 'Meridian Seguros · Prospecção', 'Reunião', 15, true), t(5, 0, '15:30', 'Atualizar previsão do mês', 'Relatório para Marina Lopes', 'Follow-up', 5, true),
          t(6, 0, '17:00', 'Enviar proposta revisada', 'Ferraz Logística · Proposta', 'E-mail', 15, false, true), t(7, 0, '17:30', 'Follow-up por WhatsApp', 'Clínica Viva · apoio à Lívia', 'Follow-up', 10), t(8, 0, '18:00', 'Revisar contrato', 'Atlas Engenharia · Fechamento', 'Follow-up', 20, false, true),
          t(9, 2, '09:30', 'Ligar para Helena Duarte', 'Grupo Lumen · Negociação · após resolver tickets', 'Ligação', 10, false, true), t(10, 2, '11:00', 'Kickoff de onboarding', 'Solaris Energia · com Diego (suporte)', 'Reunião', 15), t(11, 3, '15:00', 'Apresentar proposta final', 'Pátio Digital · com Lívia', 'Reunião', 15), t(12, -2, '10:00', 'Enviar pesquisa NPS trimestral', 'Grupo Lumen · Cliente', 'E-mail', 5)
        ],
        teamToday: [['ML', 7, 7], ['BK', 6, 8], ['LR', 4, 6], ['RT', 9, 11], ['DA', 12, 14]],
        hidTickets: { 'Diego Almeida': 9, 'Júlia Prado': 7, 'Cauã Augusto': 1 },
        tickets: [
          { id: '#4830', q: 'c', ch: 'E-mail', cat: 'Integrações', title: 'Integração com ERP parou de sincronizar pedidos', from: 'Helena Duarte', fc: '#5FE0F0', org: 'Grupo Lumen · Dir. Comercial', prio: 'Alta', slaMin: 52, tot: 370, agent: 'Diego Almeida', since: 'mar 2025', hist: 6, msgs: [['c', 'Helena Duarte', '15:12', 'Desde ontem à noite os pedidos do ERP não aparecem no CosmoDash. Temos reunião de fechamento de mês amanhã cedo e preciso dos números corretos.'], ['a', 'Diego Almeida', '15:20', 'Oi, Helena! Já estou verificando. Pode me confirmar se alguém do seu time trocou a senha do usuário de integração esta semana?'], ['n', 'Diego Almeida', '15:41', 'O token da integração expirou na renovação de senha. Precisa reautenticar com o admin do cliente.\nCauã: atenção, Lumen está em negociação de expansão.']] },
          { id: '#4827', q: 'c', ch: 'Chat', cat: 'Acesso', title: 'Usuários sem acesso após troca de senha', from: 'Marcos Lima', fc: '#ADA0FF', org: 'Grupo Lumen · TI', prio: 'Média', slaMin: 100, tot: 240, agent: 'Júlia Prado', since: 'mar 2025', hist: 6, msgs: [['c', 'Marcos Lima', '14:02', 'Três vendedores nossos não conseguem entrar desde a política nova de senha.'], ['a', 'Júlia Prado', '14:10', 'Oi, Marcos. Vou forçar a redefinição para os três e te aviso em seguida.']] },
          { id: '#4819', q: 'c', ch: 'WhatsApp', cat: 'Relatórios', title: 'Relatório mensal com valores divergentes', from: 'Rui Moura', fc: '#FF9A62', org: 'Casa Moura · Financeiro', prio: 'Média', slaMin: 185, tot: 285, agent: 'Diego Almeida', since: 'ago 2024', hist: 3, msgs: [['c', 'Rui Moura', '11:47', 'O total do mês passado no relatório está R$ 4.200 acima do que fechamos. Podem conferir?']] },
          { id: '#4825', q: 'c', ch: 'Chat', cat: 'Importação', title: 'Dúvida sobre importação de contatos', from: 'Laura Brito', fc: '#5ADFA4', org: 'Solaris Energia · Compras', prio: 'Baixa', slaMin: 360, tot: 420, agent: 'Júlia Prado', since: 'hoje', hist: 1, msgs: [['c', 'Laura Brito', '16:05', 'Acabamos de assinar! Qual o formato do CSV para importar nossa base de 2 mil contatos?']] },
          { id: 'I-212', q: 'i', ch: 'Interno', cat: 'Permissões', title: 'Acesso ao funil Expansão de contas', from: 'Thiago Nunes', fc: '#F3D06E', org: 'Vértice Labs · SDR', prio: 'Média', slaMin: 240, tot: 340, agent: 'Cauã Augusto', since: 'equipe', hist: 2, msgs: [['c', 'Thiago Nunes', '10:15', 'Vou assumir as contas de expansão da Squad Ômega. Preciso de permissão de edição no funil Expansão.']] },
          { id: 'I-209', q: 'i', ch: 'Interno', cat: 'Materiais', title: 'Template de proposta com o logo novo', from: 'Bianca Kato', fc: '#ADA0FF', org: 'Vértice Labs · Closer', prio: 'Baixa', slaMin: 1440, tot: 1600, agent: 'Marina Lopes', since: 'equipe', hist: 4, msgs: [['c', 'Bianca Kato', 'ontem', 'O modelo de proposta ainda usa o logo antigo. Alguém consegue atualizar?']] }
        ],
        feed: [{ ini: 'BK', who: 'Bianca Kato', what: 'ganhou Solaris Energia · R$ 54.000', xp: 212, ago: 12 }, { ini: 'DA', who: 'Diego Almeida', what: 'resolveu o ticket #4821 dentro do SLA', xp: 20, ago: 26 }, { ini: 'RT', who: 'Rafael Torres', what: 'agendou reunião com Ferraz Logística', xp: 0, ago: 60 }, { ini: 'ML', who: 'Marina Lopes', what: 'desbloqueou a conquista Fechador de elite', xp: 0, ago: 120, peer: true }, { ini: 'CA', who: 'Você', what: 'moveu Atlas Engenharia para Fechamento', xp: 25, ago: 180 }],
        notifications: [n(1, 'Grupo Lumen está há 12 dias sem contato', 'Pipeline.dc.html'), n(2, 'Ticket #4830 com SLA vencendo em menos de 1 h', 'Suporte.dc.html'), n(3, 'Bianca Kato ganhou Solaris Energia', 'Pipeline.dc.html', false)],
        usage: { cosmo: 412, storage: 3.2 },
        invoices: [['Jun 2026', 'Pro · 8 assentos', 792, '05/06/2026'], ['Jul 2026', 'Pro · 9 assentos', 891, '06/07/2026'], ['Ago 2026', 'Pro · 9 assentos', 891, '05/08/2026'], ['Set 2026', 'Pro · 10 assentos', 990, '05/09/2026'], ['Out 2026', 'Pro · 10 assentos', 990, '05/10/2026']].reverse()
      },
      n: {
        name: 'Nordtech Soluções', mark: 'NT', color: '#FF9A62', role: 'Gestor', plan: 'business', cycle: 'a', pay: 'p', cardLabel: 'Mastercard •••• 2041',
        me: { lvl: 8, xp: 1420, season: 3120, streak: 2, squad: 'Comercial Sul', won: 42300, goalWon: 60000, created: 7, createdGoal: 12, acts: 94, actsGoal: 150 },
        k: { wonBase: 186900, wonCount: 8, goal: 240000, delta: '+9,9%', conv: '19,8%', convDelta: '−0,7 pp', up: false, sla: '97%', first: '22 min', csat: '4,8', spark: '0,14 33,16 66,12 100,18 133,20 166,19 200,21', cycleDays: 24, weekWon: 2, weekVal: 41000, weekActs: 58, leadReply: '19 min' },
        bars: [131, 142, 155, 149, 170],
        funnels: [{ id: 'b2b', name: 'Vendas corporativas' }],
        hid: { b2b: [[7, 90000], [4, 101000], [3, 108000], [2, 77000], [0, 0]] },
        deals: [d('cais', 'Cais Logística', 28000, 0, 'SV', 'Marta Prates', 'Dir. de Compras', 4, 'Outbound'), d('serra', 'Serra Foods', 41000, 1, 'CA', 'Luís Vidal', 'Gerente de TI', 2, 'Inbound · site'), d('uno', 'Rede Uno', 63000, 2, 'SV', 'Elisa Bento', 'COO', 12, 'Indicação'), d('triade', 'Tríade Seguros', 52000, 3, 'CA', 'Caio Rangel', 'CFO', 6, 'Evento'), d('monte', 'Monte Alto Agro', 82000, 4, 'PG', 'Vera Sá', 'CEO', 2, 'Indicação')],
        people: [m('CA', 'Cauã Augusto', 'caua@nordtech.com.br', 'Comercial Sul', 8, 'agora', true, P.CA, 'Gestor', 3120), m('SV', 'Sara Viana', 'sara@nordtech.com.br', 'Comercial Sul', 18, 'há 8 min', true, '#FF9A62', 'Admin', 8840), m('PG', 'Paulo Gomes', 'paulo@nordtech.com.br', 'Comercial Norte', 11, 'há 40 min', true, '#ADA0FF', 'Vendedor', 4410), m('IC', 'Iara Costa', 'iara@nordtech.com.br', 'Atendimento', 10, 'ontem', true, '#5ADFA4', 'Suporte', 3900)],
        hidMembers: 19, invites: [], squads: ['Comercial Sul', 'Comercial Norte', 'Atendimento'],
        squad: { lvl: 12, pct: 41, won: 98200, goalWon: 140000, wins: 4, winsGoal: 7, resp: '18 min', respGoal: '20 min' },
        contactsBase: 3180,
        companies: [['Serra Foods', 'Alimentos', 'Oportunidade', '—'], ['Tríade Seguros', 'Financeiro', 'Oportunidade', '—'], ['Rede Uno', 'Varejo', 'Oportunidade', '—']],
        contacts: [k('luis', 'Luís Vidal', 'Gerente de TI', 'Serra Foods', 2, 71, 'CA', ['Inbound'], 'Pediu comparação com a ferramenta atual. Envie antes da próxima reunião.'), k('caio', 'Caio Rangel', 'CFO', 'Tríade Seguros', 6, 64, 'CA', ['Decisor'], 'Quer proposta com pagamento trimestral.'), k('elisa', 'Elisa Bento', 'COO', 'Rede Uno', 12, 44, 'SV', ['Indicação'], 'Sem resposta há 12 dias. Peça apoio de quem indicou.')],
        tasks: [t(1, 0, '10:00', 'Revisar proposta da Tríade', 'Tríade Seguros · Negociação', 'E-mail', 15, true), t(2, 0, '16:00', 'Ligar para Luís Vidal', 'Serra Foods · Qualificação', 'Ligação', 10), t(3, 1, '09:00', 'Reunião de pipeline', 'Comercial Sul', 'Reunião', 5)],
        teamToday: [['SV', 5, 6], ['PG', 3, 5], ['IC', 8, 9]],
        hidTickets: { 'Iara Costa': 8 },
        tickets: [{ id: '#1207', q: 'c', ch: 'E-mail', cat: 'Acesso', title: 'Convite expirado para novo gestor', from: 'Marta Prates', fc: '#FF9A62', org: 'Cais Logística · Compras', prio: 'Média', slaMin: 150, tot: 300, agent: 'Iara Costa', since: 'jan 2026', hist: 2, msgs: [['c', 'Marta Prates', '13:20', 'O convite do nosso novo gestor expirou. Podem reenviar?']] }],
        feed: [{ ini: 'SV', who: 'Sara Viana', what: 'ganhou Porto Verde · R$ 36.000', xp: 158, ago: 45 }, { ini: 'IC', who: 'Iara Costa', what: 'resolveu o ticket #1201 dentro do SLA', xp: 20, ago: 90 }],
        notifications: [n(1, 'Rede Uno está há 12 dias sem contato', 'Pipeline.dc.html')],
        usage: { cosmo: 1840, storage: 41 },
        invoices: [['Out 2026', 'Business anual · parcela', 3134, '05/10/2026'], ['Set 2026', 'Business anual · parcela', 3134, '05/09/2026']]
      },
      a: {
        name: 'Aurora Franquias', mark: 'AF', color: '#ADA0FF', role: 'Vendedor', plan: 'starter', cycle: 'm', pay: 'b', cardLabel: 'Sem cartão cadastrado',
        me: { lvl: 4, xp: 860, season: 1240, streak: 1, squad: 'Franquias', won: 33000, goalWon: 50000, created: 5, createdGoal: 8, acts: 41, actsGoal: 80 },
        k: { wonBase: 98450, wonCount: 5, goal: 150000, delta: '+8,2%', conv: '28,3%', convDelta: '+4,0 pp', up: true, sla: '89%', first: '1h 05', csat: '4,4', spark: '0,32 33,30 66,26 100,24 133,18 166,15 200,10', cycleDays: 30, weekWon: 1, weekVal: 21000, weekActs: 22, leadReply: '42 min' },
        bars: [61, 70, 74, 82, 91],
        funnels: [{ id: 'b2b', name: 'Novas franquias' }],
        hid: { b2b: [[4, 54000], [3, 54000], [1, 27000], [1, 27000], [0, 0]] },
        deals: [d('centro', 'Franquia Centro', 18000, 0, 'CA', 'Davi Lins', 'Investidor', 3, 'Inbound · site'), d('sul', 'Franquia Sul', 27000, 1, 'AM', 'Olga Reis', 'Investidora', 5, 'Evento'), d('norte', 'Franquia Norte', 39000, 2, 'CA', 'Hugo Paz', 'Investidor', 15, 'Indicação'), d('leste', 'Franquia Leste', 31000, 3, 'AM', 'Rita Sales', 'Investidora', 4, 'Inbound · site'), d('oeste', 'Franquia Oeste', 33000, 4, 'CA', 'Enzo Faro', 'Investidor', 2, 'Indicação')],
        people: [m('CA', 'Cauã Augusto', 'caua@aurorafranquias.com.br', 'Franquias', 4, 'agora', true, P.CA, 'Vendedor', 1240), m('AM', 'Ana Moraes', 'ana@aurorafranquias.com.br', 'Franquias', 9, 'há 1 h', true, '#ADA0FF', 'Admin', 3320), m('BS', 'Beto Sena', 'beto@aurorafranquias.com.br', 'Franquias', 3, 'ontem', false, '#5ADFA4', 'Suporte', 980)],
        hidMembers: 0, invites: [], squads: ['Franquias'],
        squad: { lvl: 3, pct: 55, won: 54300, goalWon: 90000, wins: 3, winsGoal: 5, resp: '42 min', respGoal: '30 min' },
        contactsBase: 620,
        companies: [['Franquia Norte', 'Franquias', 'Oportunidade', '—'], ['Franquia Oeste', 'Franquias', 'Oportunidade', '—']],
        contacts: [k('hugo', 'Hugo Paz', 'Investidor', 'Franquia Norte', 15, 36, 'CA', ['Indicação'], 'Parado há 15 dias. Retome com a simulação de retorno.'), k('enzo', 'Enzo Faro', 'Investidor', 'Franquia Oeste', 2, 83, 'CA', ['Decisor'], 'Contrato em revisão. Pergunte sobre o prazo de assinatura.')],
        tasks: [t(1, 0, '11:00', 'Enviar simulação de retorno', 'Franquia Norte · Proposta', 'E-mail', 15), t(2, 1, '14:00', 'Revisar contrato', 'Franquia Oeste · Fechamento', 'Follow-up', 20)],
        teamToday: [['AM', 4, 5], ['BS', 6, 7]],
        hidTickets: { 'Beto Sena': 4 },
        tickets: [{ id: '#308', q: 'c', ch: 'Chat', cat: 'Relatórios', title: 'Como exportar a lista de franqueados', from: 'Olga Reis', fc: '#ADA0FF', org: 'Franquia Sul · Investidora', prio: 'Baixa', slaMin: 300, tot: 480, agent: 'Beto Sena', since: 'jul 2026', hist: 1, msgs: [['c', 'Olga Reis', '09:42', 'Preciso exportar a lista de franqueados para o contador. Como faço?']] }],
        feed: [{ ini: 'AM', who: 'Ana Moraes', what: 'ganhou Franquia Litoral · R$ 21.000', xp: 113, ago: 200 }],
        notifications: [n(1, 'Franquia Norte está há 15 dias sem contato', 'Pipeline.dc.html')],
        usage: { cosmo: 96, storage: 1.1 },
        invoices: [['Out 2026', 'Starter · 3 assentos', 147, '05/10/2026'], ['Set 2026', 'Starter · 3 assentos', 147, '05/09/2026']]
      }
    }
  };

  if (typeof module !== 'undefined') module.exports = ORB_SEED; else window.ORB_SEED = ORB_SEED;
})();
