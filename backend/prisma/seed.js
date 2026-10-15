import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const prisma = new PrismaClient();

// Permissões da Fase 1 + Bloco 3 (membros, obreiros, disponibilidade,
// escalas). Novas fases (finance.* etc.) entram aqui depois, sem
// precisar mudar a lógica de seed.
const PERMISSIONS = [
  { slug: 'users.view', description: 'Visualizar usuários' },
  { slug: 'users.create', description: 'Criar usuários' },
  { slug: 'users.edit', description: 'Editar usuários' },
  { slug: 'users.delete', description: 'Desativar/excluir usuários' },
  { slug: 'users.manage', description: 'Gerenciar usuários e permissões (acesso total ao módulo)' },
  { slug: 'roles.manage', description: 'Gerenciar roles e permissões' },
  { slug: 'audit.view', description: 'Visualizar logs de auditoria' },
  { slug: 'settings.manage', description: 'Gerenciar configurações do sistema' },
  { slug: 'public_site.manage', description: 'Gerenciar conteúdo público da igreja' },

  { slug: 'members.view', description: 'Visualizar membros' },
  { slug: 'members.create', description: 'Cadastrar membros' },
  { slug: 'members.edit', description: 'Editar membros' },
  { slug: 'members.delete', description: 'Desativar membros' },

  { slug: 'workers.view', description: 'Visualizar obreiros' },
  { slug: 'workers.create', description: 'Cadastrar obreiros' },
  { slug: 'workers.edit', description: 'Editar obreiros' },
  { slug: 'workers.delete', description: 'Desativar obreiros' },
  { slug: 'workers.manage_functions', description: 'Criar/remover funções de obreiro' },

  { slug: 'ecclesiastical_roles.view', description: 'Visualizar cargos eclesiásticos' },
  { slug: 'ecclesiastical_roles.manage', description: 'Criar/ativar/desativar cargos eclesiásticos' },

  { slug: 'worships.view', description: 'Visualizar cultos, palavra e louvor' },
  { slug: 'worships.create', description: 'Registrar cultos' },
  { slug: 'worships.edit', description: 'Editar culto, palavra e repertório de louvor' },
  { slug: 'worships.delete', description: 'Excluir cultos' },

  { slug: 'donations.view', description: 'Visualizar doações e campanhas' },
  { slug: 'donations.create', description: 'Registrar doações' },
  { slug: 'donations.manage', description: 'Confirmar/cancelar doações e gerenciar campanhas' },
  { slug: 'donations.participate', description: 'Registrar intenção de doação em campanhas públicas' },
  { slug: 'donations.finance_post', description: 'Registrar transferência de campanha no financeiro oficial' },
  { slug: 'donations.expenses.manage', description: 'Gerenciar despesas internas de campanha' },
  { slug: 'donations.reminders.send', description: 'Enviar lembretes de contribuições pendentes' },
  { slug: 'schedule.reminders.send', description: 'Enviar lembretes de confirmação de escala' },
  { slug: 'visitors.view', description: 'Visualizar cadastros de visitantes' },
  { slug: 'visitors.create', description: 'Cadastrar visitantes' },
  { slug: 'visitors.manage', description: 'Gerenciar visitantes e retornos' },
  { slug: 'prayer_requests.view', description: 'Visualizar pedidos de oração' },
  { slug: 'prayer_requests.create', description: 'Enviar pedidos de oração' },
  { slug: 'prayer_requests.manage', description: 'Gerenciar pedidos de oração' },
  { slug: 'ministries.manage', description: 'Gerenciar ministérios' },
  { slug: 'media.manage', description: 'Gerenciar mídias e transmissões' },
  { slug: 'groups.manage', description: 'Gerenciar pequenos grupos' },
  { slug: 'bulletins.manage', description: 'Gerenciar boletins' },

  { slug: 'availability.manage', description: 'Gerenciar disponibilidade de qualquer obreiro' },
  { slug: 'availability.edit_own', description: 'Editar a própria disponibilidade' },

  { slug: 'schedule.view', description: 'Visualizar escalas (Obreiro vê somente as próprias)' },
  { slug: 'schedule.create', description: 'Criar escalas' },
  { slug: 'schedule.edit', description: 'Editar escalas e designações' },
  { slug: 'schedule.delete', description: 'Excluir escalas' },
  { slug: 'schedule.confirm_own', description: 'Confirmar ou recusar a própria designação em uma escala' },

  { slug: 'events.view', description: 'Visualizar eventos' },
  { slug: 'events.create', description: 'Criar eventos' },
  { slug: 'events.edit', description: 'Editar eventos' },
  { slug: 'events.delete', description: 'Excluir eventos' },

  { slug: 'announcements.view', description: 'Visualizar avisos' },
  { slug: 'announcements.manage', description: 'Criar, editar, publicar e arquivar avisos' },

  { slug: 'finance.view', description: 'Visualizar financeiro' },
  { slug: 'finance.create', description: 'Lançar receitas/despesas' },
  { slug: 'finance.edit', description: 'Editar lançamentos financeiros' },
  { slug: 'finance.delete', description: 'Excluir lançamentos financeiros' },
  { slug: 'finance.manage_categories', description: 'Criar categorias financeiras' },
];

// Funções padrão de obreiro (churchId null = globais do sistema),
// conforme o documento do projeto. Igrejas podem criar funções
// customizadas próprias via POST /workers/functions.
const DEFAULT_WORKER_FUNCTIONS = [
  { name: 'Diácono', slug: 'diacono' },
  { name: 'Presbítero', slug: 'presbitero' },
  { name: 'Cooperador', slug: 'cooperador' },
  { name: 'Líder', slug: 'lider' },
  { name: 'Recepção', slug: 'recepcao' },
  { name: 'Louvor', slug: 'louvor' },
  { name: 'Mídia', slug: 'midia' },
  { name: 'Sonoplastia', slug: 'sonoplastia' },
  { name: 'Portaria', slug: 'portaria' },
  { name: 'Intercessão', slug: 'intercessao' },
  { name: 'Saudação', slug: 'saudacao' },
  { name: 'Palavra', slug: 'palavra' },
  { name: 'Projeção', slug: 'projecao' },
  { name: 'Apoio', slug: 'apoio' },
  { name: 'Outros', slug: 'outros' },
];

// Cargo eclesiástico (título ministerial do membro) — conceito distinto
// de WorkerFunction (que é a função do obreiro numa escala/culto).
const DEFAULT_ECCLESIASTICAL_ROLES = [
  { name: 'Pastor', slug: 'pastor' },
  { name: 'Presbítero', slug: 'presbitero_cargo' },
  { name: 'Diácono', slug: 'diacono_cargo' },
  { name: 'Obreiro', slug: 'obreiro_cargo' },
  { name: 'Missionário', slug: 'missionario' },
  { name: 'Líder', slug: 'lider_cargo' },
  { name: 'Cooperador', slug: 'cooperador_cargo' },
  { name: 'Membro', slug: 'membro_cargo' },
  { name: 'Outro', slug: 'outro_cargo' },
];

const DEFAULT_FINANCIAL_CATEGORIES = [
  { name: 'Dízimos', slug: 'dizimos', type: 'income' },
  { name: 'Ofertas', slug: 'ofertas', type: 'income' },
  { name: 'Doações', slug: 'doacoes', type: 'income' },
  { name: 'Eventos (receita)', slug: 'eventos_receita', type: 'income' },
  { name: 'Outras receitas', slug: 'outras_receitas', type: 'income' },
  { name: 'Energia', slug: 'energia', type: 'expense' },
  { name: 'Água', slug: 'agua', type: 'expense' },
  { name: 'Internet', slug: 'internet', type: 'expense' },
  { name: 'Aluguel', slug: 'aluguel', type: 'expense' },
  { name: 'Manutenção', slug: 'manutencao', type: 'expense' },
  { name: 'Material', slug: 'material', type: 'expense' },
  { name: 'Eventos (despesa)', slug: 'eventos_despesa', type: 'expense' },
  { name: 'Alimentação', slug: 'alimentacao', type: 'expense' },
  { name: 'Equipamentos', slug: 'equipamentos', type: 'expense' },
  { name: 'Outras despesas', slug: 'outras_despesas', type: 'expense' },
];

// Roles iniciais descritas no documento do projeto.
// Cada uma recebe um subconjunto de permissões da Fase 1 -
// os módulos futuros (finance, members, schedules...) adicionarão
// permissões próprias a estas mesmas roles.
const ROLES = [
  {
    slug: 'admin_geral',
    name: 'Administrador Geral',
    permissions: PERMISSIONS.map((p) => p.slug), // acesso total
  },
  {
    slug: 'admin_financeiro',
    name: 'Administrador Financeiro',
    permissions: [
      'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.manage_categories',
      'donations.view', 'donations.create', 'donations.manage', 'donations.participate',
      'donations.finance_post', 'donations.expenses.manage', 'donations.reminders.send',
      'events.view', 'announcements.view',
    ],
  },
  {
    slug: 'admin_obreiros',
    name: 'Administrador de Obreiros',
    permissions: [
      'workers.view', 'workers.create', 'workers.edit', 'workers.delete', 'workers.manage_functions',
      'availability.manage',
      'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.delete',
      'worships.view', 'worships.create', 'worships.edit', 'worships.delete',
      'donations.view', 'donations.participate', 'schedule.reminders.send', 'groups.manage', 'ministries.manage',
      'events.view', 'announcements.view',
    ],
  },
  {
    slug: 'membresia',
    name: 'Membresia',
    permissions: [
      'members.view', 'members.create', 'members.edit', 'members.delete',
      'ecclesiastical_roles.view', 'ecclesiastical_roles.manage',
      'events.view', 'announcements.view',
    ],
  },
  {
    slug: 'secretaria',
    name: 'Secretaria',
    // Cadastro/atualização de membros e consulta de cargos eclesiásticos —
    // explicitamente SEM acesso a financeiro (nenhuma permissão finance.*
    // é concedida aqui) e sem gerenciar o catálogo de cargos (isso fica
    // com Membresia/Admin Geral).
    permissions: [
      'members.view', 'members.create', 'members.edit',
      'workers.view', 'workers.create', 'workers.edit',
      'ecclesiastical_roles.view',
      'events.view', 'events.create', 'events.edit',
      'announcements.view', 'announcements.manage',
      'donations.view', 'donations.create', 'donations.manage', 'donations.participate',
      'donations.expenses.manage', 'donations.reminders.send', 'visitors.view', 'visitors.create', 'visitors.manage',
    ],
  },
  {
    slug: 'obreiro',
    name: 'Obreiro',
    // Só a própria disponibilidade e as próprias escalas — o filtro de
    // "só as minhas" para schedule.view é aplicado no schedules.service.js.
    permissions: ['availability.edit_own', 'schedule.view', 'schedule.confirm_own', 'events.view', 'announcements.view', 'donations.participate'],
  },
  {
    slug: 'membro',
    name: 'Membro',
    permissions: ['events.view', 'announcements.view', 'donations.participate'],
  },
];

// Igreja padrão criada no bootstrap. Em uma instalação multi-igreja
// futura, novas igrejas serão criadas por uma tela de administração —
// esta função só garante que a igreja desta instalação exista na primeira execução.
// Nome e slug vêm de SEED_CHURCH_NAME / SEED_CHURCH_SLUG (veja .env.example); o slug
// deve ser o mesmo configurado em VITE_CHURCH_SLUG no frontend.
async function ensureDefaultChurch() {
  const name = (process.env.SEED_CHURCH_NAME || 'Minha Igreja').trim();
  const slug = (process.env.SEED_CHURCH_SLUG || 'minha-igreja').trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('SEED_CHURCH_SLUG inválido: use apenas letras minúsculas, números e hífens (ex: minha-igreja).');
  }
  const church = await prisma.church.upsert({
    where: { slug },
    update: {},
    create: { name, slug, status: 'active' },
  });
  return church;
}

async function upsertPermissionsAndRoles() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: { description: perm.description },
      create: perm,
    });
  }

  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { slug: roleDef.slug },
      update: { name: roleDef.name },
      create: { slug: roleDef.slug, name: roleDef.name },
    });

    for (const permSlug of roleDef.permissions) {
      const permission = await prisma.permission.findUnique({ where: { slug: permSlug } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

async function createFirstAdminIfNeeded(church) {
  // Escopo por igreja: cada igreja precisa do seu próprio Administrador
  // Geral. Isso continua correto quando novas igrejas forem criadas no
  // futuro, cada uma passando por este mesmo bootstrap.
  const existingAdmin = await prisma.user.findFirst({
    where: { role: { slug: 'admin_geral' }, churchId: church.id },
  });

  if (existingAdmin) {
    console.log(`Já existe um Administrador Geral para "${church.name}". Nenhum usuário novo foi criado.`);
    return;
  }

  console.log(`\nNenhum Administrador Geral encontrado para "${church.name}". Vamos criar o primeiro agora.`);
  const rl = readline.createInterface({ input, output });

  const name = await rl.question('Nome completo do administrador: ');
  const email = await rl.question('E-mail: ');
  let password = await rl.question('Senha (mínimo 8 caracteres): ');
  while (!password || password.length < 8) {
    password = await rl.question('Senha inválida. Digite novamente (mínimo 8 caracteres): ');
  }
  rl.close();

  const adminRole = await prisma.role.findUnique({ where: { slug: 'admin_geral' } });
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: adminRole.id,
      churchId: church.id,
      status: 'active',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      churchId: church.id,
      action: 'user.created',
      module: 'setup',
      targetId: user.id,
      metadata: { note: 'Administrador Geral inicial criado via seed' },
    },
  });

  console.log(`\nAdministrador Geral "${name}" criado com sucesso para "${church.name}".`);
}

async function ensureDefaultWorkerFunctions() {
  for (const fn of DEFAULT_WORKER_FUNCTIONS) {
    await prisma.workerFunction.upsert({
      where: { slug: fn.slug },
      update: { name: fn.name },
      create: { name: fn.name, slug: fn.slug, churchId: null },
    });
  }
}

async function ensureDefaultEcclesiasticalRoles() {
  for (const role of DEFAULT_ECCLESIASTICAL_ROLES) {
    await prisma.ecclesiasticalRole.upsert({
      where: { slug: role.slug },
      update: { name: role.name },
      create: { name: role.name, slug: role.slug, churchId: null },
    });
  }
}

async function ensureDefaultFinancialCategories() {
  for (const cat of DEFAULT_FINANCIAL_CATEGORIES) {
    await prisma.financialCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, type: cat.type },
      create: { name: cat.name, slug: cat.slug, type: cat.type, churchId: null },
    });
  }
}

function nextWeekday(dayOfWeek0Sunday) {
  const d = new Date();
  const diff = (dayOfWeek0Sunday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// Cria um conjunto de dados de demonstração (obreiros, membros, escalas,
// eventos, avisos, financeiro) só se a igreja ainda não tiver NENHUM
// membro cadastrado — protege dados reais de serem duplicados ou
// sobrescritos em execuções repetidas do seed.
async function ensureDemoWorkers(church, demoUsers, functions) {
  const existingCount = await prisma.worker.count({ where: { churchId: church.id } });
  if (existingCount > 0) {
    console.log('Obreiros de demonstração já existem — reaproveitando os existentes.');
    const [worker1, worker2, worker3, worker4] = await Promise.all([
      prisma.worker.findFirst({ where: { churchId: church.id, name: 'João Pedro' } }),
      prisma.worker.findFirst({ where: { churchId: church.id, name: 'Carlos Eduardo' } }),
      prisma.worker.findFirst({ where: { churchId: church.id, name: 'Pedro Henrique' } }),
      prisma.worker.findFirst({ where: { churchId: church.id, name: 'Marcia Alves' } }),
    ]);
    return { worker1, worker2, worker3, worker4 };
  }

  console.log('Criando obreiros de demonstração...');
  const worker1 = await prisma.worker.create({
    data: {
      name: 'João Pedro', churchId: church.id, userId: demoUsers.obreiro.id,
      functionId: functions.louvor.id, ministry: 'Louvor', status: 'active',
      phone: '(21) 99999-0001', joinDate: daysFromNow(-400),
    },
  });
  const worker2 = await prisma.worker.create({
    data: {
      name: 'Carlos Eduardo', churchId: church.id,
      functionId: functions.midia.id, ministry: 'Mídia', status: 'active',
      phone: '(21) 99999-0002', joinDate: daysFromNow(-200),
    },
  });
  const worker3 = await prisma.worker.create({
    data: {
      name: 'Pedro Henrique', churchId: church.id,
      functionId: functions.recepcao.id, ministry: 'Recepção', status: 'active',
      phone: '(21) 99999-0003', joinDate: daysFromNow(-90),
    },
  });
  const worker4 = await prisma.worker.create({
    data: {
      name: 'Marcia Alves', churchId: church.id,
      functionId: functions.intercessao.id, ministry: 'Intercessão', status: 'active',
      phone: '(21) 99999-0004', joinDate: daysFromNow(-60),
    },
  });

  return { worker1, worker2, worker3, worker4 };
}

async function ensureDemoAvailability(worker1) {
  if (!worker1) return;
  const existing = await prisma.availability.count({ where: { workerId: worker1.id } });
  if (existing > 0) {
    console.log('Disponibilidade de demonstração já existe — pulando.');
    return;
  }
  console.log('Criando disponibilidade de demonstração...');
  await prisma.availability.createMany({
    data: [
      { workerId: worker1.id, dayOfWeek: 'sunday', status: 'available' },
      { workerId: worker1.id, dayOfWeek: 'wednesday', status: 'unavailable' },
      { workerId: worker1.id, dayOfWeek: 'friday', status: 'partial', startTime: '18:00', endTime: '22:00' },
    ],
  });
}

async function ensureDemoMembers(church) {
  const existing = await prisma.member.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Membros de demonstração já existem — pulando.');
    return;
  }

  console.log('Criando membros de demonstração...');
  const birthdaySoon = daysFromNow(5);
  const member1 = await prisma.member.create({
    data: {
      fullName: 'Maria da Silva', churchId: church.id, status: 'active',
      phone: '(21) 98888-0001', email: 'maria.silva@example.com',
      birthDate: new Date(1985, birthdaySoon.getMonth(), birthdaySoon.getDate()),
      joinDate: daysFromNow(-1000), ministry: 'Intercessão', groupName: 'Célula Central',
    },
  });
  await prisma.member.create({
    data: {
      fullName: 'Pedrinho da Silva', churchId: church.id, status: 'active',
      birthDate: new Date(2015, 5, 10), joinDate: daysFromNow(-500),
      responsibleId: member1.id,
    },
  });
  await prisma.member.create({
    data: {
      fullName: 'José Almeida', churchId: church.id, status: 'active',
      phone: '(21) 98888-0002', birthDate: new Date(1978, 2, 22),
      joinDate: daysFromNow(-2000), ministry: 'Diaconato',
    },
  });
  await prisma.member.create({
    data: {
      fullName: 'Fernanda Costa', churchId: church.id, status: 'visitor',
      phone: '(21) 98888-0003', joinDate: daysFromNow(-10),
    },
  });
  await prisma.member.create({
    data: {
      fullName: 'Roberto Nunes', churchId: church.id, status: 'active',
      phone: '(21) 98888-0004', birthDate: new Date(1990, 8, 30), joinDate: daysFromNow(-800),
    },
  });
  await prisma.member.create({
    data: { fullName: 'Beatriz Rocha', churchId: church.id, status: 'inactive', joinDate: daysFromNow(-1500) },
  });
}

async function ensureDemoSchedules(church, workers, functions, demoUsers) {
  const { worker1, worker2, worker3 } = workers;
  if (!worker1 || !worker2 || !worker3) {
    console.warn('Pulando escalas de demonstração: obreiros de referência não encontrados (dados de demo parcialmente ausentes).');
    return;
  }

  const existing = await prisma.schedule.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Escalas de demonstração já existem — pulando.');
    return;
  }

  console.log('Criando escalas de demonstração...');
  const pastSchedule = await prisma.schedule.create({
    data: {
      churchId: church.id, title: 'Culto de Celebração', type: 'culto',
      date: daysFromNow(-7),
      startTime: '19:00', endTime: '21:00',
    },
  });
  await prisma.scheduleAssignment.createMany({
    data: [
      { scheduleId: pastSchedule.id, workerId: worker1.id, functionId: functions.louvor.id, status: 'confirmed' },
      { scheduleId: pastSchedule.id, workerId: worker2.id, functionId: functions.midia.id, status: 'confirmed' },
    ],
    skipDuplicates: true,
  });

  const futureSchedule = await prisma.schedule.create({
    data: {
      churchId: church.id, title: 'Culto de Celebração', type: 'culto',
      date: nextWeekday(0), startTime: '19:00', endTime: '21:00',
      notes: 'Culto de domingo à noite',
    },
  });
  await prisma.scheduleAssignment.createMany({
    data: [
      { scheduleId: futureSchedule.id, workerId: worker1.id, functionId: functions.louvor.id, status: 'pending' },
      { scheduleId: futureSchedule.id, workerId: worker2.id, functionId: functions.midia.id, status: 'confirmed' },
      { scheduleId: futureSchedule.id, workerId: worker3.id, functionId: functions.recepcao.id, status: 'pending' },
    ],
    skipDuplicates: true,
  });

  if (demoUsers.obreiro) {
    await prisma.notification.create({
      data: {
        churchId: church.id, userId: demoUsers.obreiro.id, type: 'schedule_new',
        title: 'Nova escala', body: `Você foi escalado para "Culto de Celebração" — confirme sua presença.`,
        relatedType: 'schedule', relatedId: futureSchedule.id,
      },
    });
  }
}

async function ensureDemoEvents(church) {
  const existing = await prisma.event.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Eventos de demonstração já existem — pulando.');
    return;
  }
  console.log('Criando eventos de demonstração...');
  await prisma.event.create({
    data: {
      churchId: church.id, name: 'Conferência de Jovens',
      description: 'Uma noite especial de louvor e palavra para os jovens da igreja.',
      date: daysFromNow(14), startTime: '19:30', location: 'Templo Sede', capacity: 200, status: 'scheduled',
    },
  });
  await prisma.event.create({
    data: {
      churchId: church.id, name: 'Escola Bíblica Dominical', description: 'Estudo semanal das escrituras.',
      date: nextWeekday(0), startTime: '09:00', endTime: '10:00', location: 'Salão Anexo', status: 'scheduled',
    },
  });
}

async function ensureDemoAnnouncements(church, demoUsers) {
  const existing = await prisma.announcement.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Avisos de demonstração já existem — pulando.');
    return;
  }
  console.log('Criando avisos de demonstração...');
  const authorId = demoUsers.membresia?.id ?? null;
  await prisma.announcement.create({
    data: {
      churchId: church.id, authorId, title: 'Manutenção do estacionamento',
      body: 'Neste domingo o estacionamento lateral estará fechado para manutenção. Utilize a entrada principal.',
      priority: 'urgent', audience: 'all', publishedAt: new Date(),
    },
  });
  await prisma.announcement.create({
    data: {
      churchId: church.id, authorId, title: 'Inscrições abertas — Conferência de Jovens',
      body: 'As inscrições para a Conferência de Jovens já estão abertas na secretaria.',
      priority: 'important', audience: 'all', publishedAt: new Date(),
    },
  });
}

async function ensureDemoFinance(church, categories) {
  const existing = await prisma.financialEntry.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Lançamentos financeiros de demonstração já existem — pulando.');
    return;
  }
  console.log('Criando lançamentos financeiros de demonstração...');
  await prisma.financialEntry.createMany({
    data: [
      { churchId: church.id, type: 'income', categoryId: categories.dizimos?.id, description: 'Dízimos do mês', amount: 8500, date: daysFromNow(-3), status: 'paid' },
      { churchId: church.id, type: 'income', categoryId: categories.ofertas?.id, description: 'Ofertas dos cultos', amount: 2100, date: daysFromNow(-3), status: 'paid' },
      { churchId: church.id, type: 'expense', categoryId: categories.energia?.id, description: 'Conta de energia', amount: 620, date: daysFromNow(-5), status: 'paid' },
      { churchId: church.id, type: 'expense', categoryId: categories.agua?.id, description: 'Conta de água', amount: 180, date: daysFromNow(-5), status: 'paid' },
      { churchId: church.id, type: 'expense', categoryId: categories.manutencao?.id, description: 'Reparo no ar-condicionado', amount: 450, date: daysFromNow(2), dueDate: daysFromNow(10), status: 'pending' },
    ],
  });
}

async function ensureDemoWorships(church, workers) {
  const existing = await prisma.worship.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Cultos de demonstração já existem — pulando.');
    return;
  }
  console.log('Criando cultos de demonstração...');
  const worship = await prisma.worship.create({
    data: {
      churchId: church.id, date: daysFromNow(-7), startTime: '19:00', endTime: '21:00',
      type: 'culto_domingo', theme: 'Fé que move montanhas', attendanceCount: 142,
      notes: 'Culto de demonstração',
    },
  });
  await prisma.sermon.create({
    data: {
      churchId: church.id, worshipId: worship.id,
      preacherName: 'Pr. José (demo)', title: 'Fé que move montanhas',
      scripture: 'Mateus 17:20', theme: 'Fé', summary: 'Mensagem de demonstração sobre fé e perseverança.',
      durationMinutes: 40,
    },
  });
  await prisma.worshipSong.createMany({
    data: [
      { worshipId: worship.id, title: 'Música de abertura (demo)', position: 1 },
      { worshipId: worship.id, title: 'Louvor de adoração (demo)', position: 2 },
      { worshipId: worship.id, title: 'Música de encerramento (demo)', position: 3 },
    ],
  });
}

async function ensureDemoDonations(church) {
  const existing = await prisma.donationCampaign.count({ where: { churchId: church.id } });
  if (existing > 0) {
    console.log('Campanhas/doações de demonstração já existem — pulando.');
    return;
  }
  console.log('Criando campanha e doações de demonstração...');
  const campaign = await prisma.donationCampaign.create({
    data: {
      churchId: church.id, name: 'Bolo dos Aniversariantes — demo', type: 'aniversariantes',
      description: 'Campanha mensal para o bolo dos aniversariantes.', goalAmount: 300, active: true,
    },
  });
  await prisma.donation.createMany({
    data: [
      { churchId: church.id, campaignId: campaign.id, donorName: 'Maria da Silva', amount: 100, date: daysFromNow(-4), type: 'campanha', paymentMethod: 'pix', status: 'confirmed' },
      { churchId: church.id, campaignId: campaign.id, donorName: 'José Almeida', amount: 115, date: daysFromNow(-3), type: 'campanha', paymentMethod: 'dinheiro', status: 'confirmed' },
      { churchId: church.id, campaignId: campaign.id, donorName: 'Doador anônimo', amount: 50, date: daysFromNow(-1), type: 'campanha', paymentMethod: 'pix', status: 'registered' },
      { churchId: church.id, donorName: 'Oferta do culto', amount: 320, date: daysFromNow(-7), type: 'oferta', paymentMethod: 'dinheiro', status: 'confirmed' },
    ],
  });
}

// Cria os dados de demonstração em SEÇÕES independentes — cada seção
// (obreiros, disponibilidade, membros, escalas, eventos, avisos,
// financeiro) verifica sua PRÓPRIA existência antes de criar, em vez de
// um único portão global. Isso torna o seed resistente a uma execução
// parcial anterior (ex: o processo caiu depois de criar os usuários mas
// antes dos membros) — rodar de novo completa só o que falta, sem
// duplicar o que já existe e sem tocar em dados reais.
//
// Limite conhecido: a proteção é por SEÇÃO, não por registro individual
// dentro dela. Se um crash acontecer no meio exato da criação de uma
// seção (ex: 1 dos 6 membros foi criado e o processo caiu), essa seção
// específica pode ficar incompleta — o guard veria "existing > 0" e
// pularia o resto dela. Nesse caso raro, seria necessário apagar
// manualmente os registros parciais dessa seção antes de rodar de novo.
// As demais seções continuam funcionando normalmente.
async function ensureDemoData(church) {
  // Sem senha fixa: a senha dos usuários de demonstração vem de SEED_DEMO_PASSWORD
  // (obrigatória, mínimo 8 caracteres). Demonstração é só para ambiente de teste.
  const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || '';
  if (DEMO_PASSWORD.length < 8) {
    throw new Error('SEED_DEMO_PASSWORD ausente ou curta (mínimo 8 caracteres). Dados de demonstração não foram criados.');
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const roles = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.slug, r])
  );
  const functions = Object.fromEntries(
    (await prisma.workerFunction.findMany()).map((f) => [f.slug, f])
  );
  const categories = Object.fromEntries(
    (await prisma.financialCategory.findMany()).map((c) => [c.slug, c])
  );

  // --- Usuários de demonstração (idempotente via upsert por e-mail) ---
  const demoUsersDef = [
    { name: 'Ana Torres', email: 'ana.financeiro@demo.example', roleSlug: 'admin_financeiro' },
    { name: 'Marcos Lima', email: 'marcos.membresia@demo.example', roleSlug: 'membresia' },
    { name: 'Rafael Souza', email: 'rafael.obreiros@demo.example', roleSlug: 'admin_obreiros' },
    { name: 'João Pedro', email: 'joao.obreiro@demo.example', roleSlug: 'obreiro' },
    { name: 'Carla Mendes', email: 'carla.membro@demo.example', roleSlug: 'membro' },
    { name: 'Paula Ribeiro', email: 'paula.secretaria@demo.example', roleSlug: 'secretaria' },
  ];
  const demoUsers = {};
  for (const def of demoUsersDef) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        name: def.name,
        email: def.email,
        passwordHash,
        roleId: roles[def.roleSlug].id,
        churchId: church.id,
        status: 'active',
      },
    });
    demoUsers[def.roleSlug] = user;
  }

  const workers = await ensureDemoWorkers(church, demoUsers, functions);
  await ensureDemoAvailability(workers.worker1);
  await ensureDemoMembers(church);
  await ensureDemoSchedules(church, workers, functions, demoUsers);
  await ensureDemoEvents(church);
  await ensureDemoAnnouncements(church, demoUsers);
  await ensureDemoFinance(church, categories);
  await ensureDemoWorships(church, workers);
  await ensureDemoDonations(church);

  console.log('Dados de demonstração prontos. A senha dos usuários de demo é o valor de SEED_DEMO_PASSWORD.');
  console.log('Usuários de demo:', demoUsersDef.map((u) => `${u.email} (${u.roleSlug})`).join(', '));
}

async function main() {
  console.log('Garantindo a igreja desta instalação...');
  const church = await ensureDefaultChurch();
  console.log(`Igreja pronta: ${church.name} (${church.id})`);

  console.log('Criando permissões e roles padrão...');
  await upsertPermissionsAndRoles();
  console.log('Permissões e roles prontas.');

  console.log('Garantindo funções padrão de obreiro...');
  await ensureDefaultWorkerFunctions();
  console.log('Funções padrão prontas.');

  console.log('Garantindo cargos eclesiásticos padrão...');
  await ensureDefaultEcclesiasticalRoles();
  console.log('Cargos eclesiásticos padrão prontos.');

  console.log('Garantindo categorias financeiras padrão...');
  await ensureDefaultFinancialCategories();
  console.log('Categorias financeiras prontas.');

  await createFirstAdminIfNeeded(church);

  // Dados fictícios só com autorização explícita (SEED_DEMO=true) e nunca em produção.
  if (process.env.SEED_DEMO === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SEED_DEMO=true é proibido com NODE_ENV=production. Nenhum dado de demonstração foi criado.');
    }
    await ensureDemoData(church);
  } else {
    console.log('Dados de demonstração NÃO criados (defina SEED_DEMO=true apenas em ambiente de teste).');
  }
}

main()
  .catch((err) => {
    console.error('Erro ao rodar o seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
