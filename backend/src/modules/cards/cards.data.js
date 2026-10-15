import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

export const MEMBER_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', visitor: 'Visitante', transferred: 'Transferido', away: 'Afastado' };
export const WORKER_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', archived: 'Arquivado' };

export const formatRma = (n) => `RMA-${String(n).padStart(6, '0')}`;

// Carrega SOMENTE o necessário para a carteirinha (nunca CPF, endereço, telefone…).
export async function loadCardSubject(kind, id, churchId) {
  if (kind === 'member') {
    const m = await prisma.member.findFirst({
      where: { id, churchId },
      select: {
        id: true, fullName: true, rmaNumber: true, photoUrl: true, status: true, ministry: true, joinDate: true,
        ecclesiasticalRoles: { where: { endDate: null }, orderBy: { startDate: 'asc' }, select: { ecclesiasticalRole: { select: { name: true } } } },
        church: { select: { name: true } },
      },
    });
    if (!m) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');
    const roles = m.ecclesiasticalRoles.map((r) => r.ecclesiasticalRole.name);
    return {
      kind, id: m.id, churchName: m.church.name, name: m.fullName, rmaNumber: m.rmaNumber, rma: formatRma(m.rmaNumber),
      category: roles[0] || 'Membro', roles, ministry: m.ministry || null, joinDate: m.joinDate, photoUrl: m.photoUrl,
      status: m.status, statusLabel: MEMBER_STATUS_LABEL[m.status] || m.status, isActive: m.status === 'active',
    };
  }
  const w = await prisma.worker.findFirst({
    where: { id, churchId },
    select: {
      id: true, name: true, rmaNumber: true, photoUrl: true, status: true, ministry: true, joinDate: true,
      function: { select: { name: true } }, church: { select: { name: true } },
    },
  });
  if (!w) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  return {
    kind, id: w.id, churchName: w.church.name, name: w.name, rmaNumber: w.rmaNumber, rma: formatRma(w.rmaNumber),
    category: 'Obreiro', roles: w.function?.name ? [w.function.name] : [], ministry: w.ministry || null, joinDate: w.joinDate, photoUrl: w.photoUrl,
    status: w.status, statusLabel: WORKER_STATUS_LABEL[w.status] || w.status, isActive: w.status === 'active',
  };
}
