import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { createNotificationForMany, notifyChurchUsers } from '../notifications/notifications.service.js';

function normalizeCampaign(data) {
  const payload = { ...data };
  if (payload.responsibleId === '') payload.responsibleId = null;
  if (payload.imageUrl === '') payload.imageUrl = null;
  if (payload.startDate === '' || payload.startDate === undefined) delete payload.startDate;
  else payload.startDate = new Date(payload.startDate);
  if (payload.endDate === '' || payload.endDate === undefined) delete payload.endDate;
  else payload.endDate = new Date(payload.endDate);
  return payload;
}

// --- Campanhas ---

export async function listCampaigns(churchId, { participant = false, publicOnly = false } = {}) {
  const now = new Date();
  const where = { churchId };

  if (participant) {
    where.active = true;

    // Campanhas futuras também ficam visíveis para participantes,
    // permitindo registrar contribuições antecipadamente.
    // O encerramento da campanha continua sendo respeitado.
    where.AND = [
      {
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    ];
  }

  if (publicOnly) where.isPublic = true;

  const campaigns = await prisma.donationCampaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Meta/arrecadado calculados sob demanda — nunca duplicados em outra
  // tabela, sempre a soma real das doações CONFIRMADAS da campanha.
  const totals = await prisma.donation.groupBy({
    by: ['campaignId'],
    where: {
      churchId,
      status: 'confirmed',
      campaignId: { in: campaigns.map((c) => c.id) }
    },
    _sum: {
      amount: true,
      quantity: true
    },
    _count: true,
  });

  const totalsByCampaign = Object.fromEntries(
    totals.map((t) => [t.campaignId, t])
  );

  return campaigns.map((c) => ({
    ...c,
    raisedAmount: Number(totalsByCampaign[c.id]?._sum.amount || 0),
    donorCount: totalsByCampaign[c.id]?._count || 0,
  }));
}

export async function createCampaign(data, actor, ipAddress) {
  const campaign = await prisma.donationCampaign.create({
    data: { ...normalizeCampaign(data), churchId: actor.churchId },
  });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'donation_campaign.created', module: 'donations',
    targetId: campaign.id, metadata: { name: campaign.name }, ipAddress,
  });

  await notifyChurchUsers(actor.churchId, {
    churchId: actor.churchId,
    type: 'campaign',
    title: 'Nova campanha de doação',
    body: `A campanha "${campaign.name}" está disponível para participação.`,
    relatedType: 'donation_campaign',
    relatedId: campaign.id,
    link: '/participar-doacoes',
  });

  return campaign;
}

export async function updateCampaign(id, data, actor, ipAddress) {
  const existing = await prisma.donationCampaign.findFirst({
    where: { id, churchId: actor.churchId }
  });

  if (!existing) {
    throw new AppError('Campanha não encontrada.', 404, 'NOT_FOUND');
  }

  const updated = await prisma.donationCampaign.update({
    where: { id },
    data: normalizeCampaign(data)
  });

  if (!existing.isPublic && updated.isPublic && updated.active) {
    await notifyChurchUsers(actor.churchId, {
      churchId: actor.churchId,
      type: 'campaign',
      title: 'Campanha publicada',
      body: `A campanha "${updated.name}" foi publicada para participação.`,
      relatedType: 'donation_campaign',
      relatedId: updated.id,
      link: '/participar-doacoes',
    });
  }

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'donation_campaign.updated', module: 'donations',
    targetId: id, metadata: data, ipAddress,
  });

  return updated;
}

export async function deleteCampaign(id, actor, ipAddress) {
  const campaign = await prisma.donationCampaign.findFirst({
    where: { id, churchId: actor.churchId }
  });

  if (!campaign) {
    throw new AppError('Campanha não encontrada.', 404, 'NOT_FOUND');
  }

  const transferCount = await prisma.campaignFinanceTransfer.count({
    where: {
      campaignId: id,
      churchId: actor.churchId
    }
  });

  if (transferCount) {
    throw new AppError(
      'Esta campanha possui repasses lançados no Financeiro. Para preservar esses lançamentos e seus vínculos, encerre a campanha em vez de excluí-la.',
      409,
      'CAMPAIGN_HAS_FINANCE_TRANSFERS'
    );
  }

  await prisma.$transaction(async (tx) => {
    const donations = await tx.donation.findMany({
      where: {
        campaignId: id,
        churchId: actor.churchId
      },
      select: { id: true }
    });

    if (donations.length) {
      const donationIds = donations.map((d) => d.id);

      await tx.notification.deleteMany({
        where: {
          relatedType: 'donation',
          relatedId: { in: donationIds }
        }
      });

      await tx.reminderLog.deleteMany({
        where: {
          churchId: actor.churchId,
          sourceType: 'donation',
          sourceId: { in: donationIds }
        }
      });
    }

    await tx.donation.deleteMany({
      where: {
        campaignId: id,
        churchId: actor.churchId
      }
    });

    await tx.donationCampaign.delete({
      where: { id }
    });
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation_campaign.deleted',
    module: 'donations',
    targetId: id,
    metadata: { name: campaign.name },
    ipAddress
  });
}

export async function listCampaignItems(churchId, campaignId) {
  const campaign = await prisma.donationCampaign.findFirst({
    where: {
      id: campaignId,
      churchId
    }
  });

  if (!campaign) {
    throw new AppError('Campanha não encontrada.', 404, 'NOT_FOUND');
  }

  const items = await prisma.donationItem.findMany({
    where: {
      churchId,
      campaignId
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const totals = await prisma.donation.groupBy({
    by: ['itemId'],
    where: {
      churchId,
      campaignId,
      status: 'confirmed',
      itemId: { in: items.map((i) => i.id) }
    },
    _sum: {
      amount: true
    },
  });

  const byItem = Object.fromEntries(
    totals.map((t) => [t.itemId, Number(t._sum.amount || 0)])
  );

  return items.map((item) => ({
    ...item,
    raisedAmount: byItem[item.id] || 0,
    raisedQuantity: Number(
      totals.find((t) => t.itemId === item.id)?._sum.quantity || 0
    )
  }));
}

export async function listMyDonations(userId, churchId) {
  return prisma.donation.findMany({
    where: {
      donorUserId: userId,
      churchId
    },
    include: donationInclude,
    orderBy: {
      date: 'desc'
    }
  });
}

export async function createCampaignItem(campaignId, data, actor, ipAddress) {
  const campaign = await prisma.donationCampaign.findFirst({
    where: {
      id: campaignId,
      churchId: actor.churchId
    }
  });

  if (!campaign) {
    throw new AppError('Campanha não encontrada.', 404, 'NOT_FOUND');
  }

  const item = await prisma.donationItem.create({
    data: {
      ...data,
      campaignId,
      churchId: actor.churchId
    }
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation_item.created',
    module: 'donations',
    targetId: item.id,
    metadata: {
      campaignId,
      name: item.name
    },
    ipAddress
  });

  return item;
}

export async function participateInCampaign(data, actor, ipAddress) {
  const now = new Date();

  // A campanha pode começar no futuro, pois o participante precisa
  // conseguir registrar a intenção de contribuição antecipadamente.
  // Apenas campanhas inativas ou já encerradas ficam bloqueadas.
  const campaign = await prisma.donationCampaign.findFirst({
    where: {
      id: data.campaignId,
      churchId: actor.churchId,
      active: true,
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      ]
    }
  });

  if (!campaign) {
    throw new AppError(
      'Campanha não encontrada ou encerrada.',
      404,
      'NOT_FOUND'
    );
  }

  const kind = data.kind || 'money';

  if (kind === 'money' && !data.amount) {
    throw new AppError(
      'Informe o valor da contribuição.',
      422,
      'VALIDATION_ERROR'
    );
  }

  if (
    ['food', 'materials'].includes(kind) &&
    (!data.quantity || !data.unit)
  ) {
    throw new AppError(
      'Informe a quantidade e a unidade da contribuição.',
      422,
      'VALIDATION_ERROR'
    );
  }

  if (kind === 'service' && !data.serviceDescription?.trim()) {
    throw new AppError(
      'Descreva o serviço oferecido.',
      422,
      'VALIDATION_ERROR'
    );
  }

  if (data.itemId) {
    const item = await prisma.donationItem.findFirst({
      where: {
        id: data.itemId,
        campaignId: campaign.id,
        churchId: actor.churchId,
        active: true
      }
    });

    if (!item) {
      throw new AppError(
        'Item/necessidade não encontrada.',
        422,
        'INVALID_ITEM'
      );
    }
  }

  const donation = await prisma.donation.create({
    data: {
      churchId: actor.churchId,
      campaignId: campaign.id,
      itemId: data.itemId,
      donorName: actor.name,
      donorUserId: actor.id,
      amount: data.amount,
      kind,
      quantity: data.quantity,
      unit: data.unit,
      estimatedAmount: data.estimatedAmount,
      serviceDescription: data.serviceDescription,
      date: new Date(),
      type: 'campanha',
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      status: 'registered'
    },
    include: donationInclude,
  });

  await prisma.donationStatusHistory.create({
    data: {
      churchId: actor.churchId,
      donationId: donation.id,
      changedById: actor.id,
      toStatus: 'registered',
      amount: data.amount,
      quantity: data.quantity,
      note: data.notes
    }
  });

  const managers = await prisma.user.findMany({
    where: {
      churchId: actor.churchId,
      status: 'active',
      role: {
        rolePermissions: {
          some: {
            permission: {
              slug: 'donations.manage'
            }
          }
        }
      }
    },
    select: {
      id: true
    },
  });

  await createNotificationForMany(
    managers.map((u) => u.id),
    {
      churchId: actor.churchId,
      type: 'donation',
      title: 'Nova intenção de doação',
      body: `${actor.name} registrou uma contribuição (${kind}) na campanha ${campaign.name}.`,
      relatedType: 'donation',
      relatedId: donation.id,
    }
  );

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation.participation_registered',
    module: 'donations',
    targetId: donation.id,
    metadata: {
      campaignId: campaign.id,
      itemId: data.itemId,
      kind,
      quantity: data.quantity
    },
    ipAddress
  });

  return donation;
}

// --- Doações ---

const donationInclude = {
  campaign: {
    select: {
      id: true,
      name: true,
      type: true
    }
  },
  item: {
    select: {
      id: true,
      name: true
    }
  },
  donorMember: {
    select: {
      id: true,
      fullName: true
    }
  },
  donorUser: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
};

export async function listDonationDonors(churchId) {
  return prisma.user.findMany({
    where: {
      churchId,
      status: 'active'
    },
    select: {
      id: true,
      name: true,
      email: true,
      member: {
        select: {
          id: true,
          fullName: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    },
  });
}

export async function listDonations(churchId, { campaignId, status } = {}) {
  const where = { churchId };

  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = status;

  return prisma.donation.findMany({
    where,
    include: donationInclude,
    orderBy: {
      date: 'desc'
    }
  });
}

export async function createDonation(data, actor, ipAddress) {
  if (data.campaignId) {
    const campaign = await prisma.donationCampaign.findFirst({
      where: {
        id: data.campaignId,
        churchId: actor.churchId
      }
    });

    if (!campaign) {
      throw new AppError(
        'Campanha informada não encontrada.',
        422,
        'INVALID_CAMPAIGN'
      );
    }
  }

  if (data.itemId) {
    const item = await prisma.donationItem.findFirst({
      where: {
        id: data.itemId,
        churchId: actor.churchId,
        campaignId: data.campaignId
      }
    });

    if (!item) {
      throw new AppError(
        'Item informado não pertence à campanha.',
        422,
        'INVALID_ITEM'
      );
    }
  }

  let donorUser = null;

  if (data.donorUserId) {
    donorUser = await prisma.user.findFirst({
      where: {
        id: data.donorUserId,
        churchId: actor.churchId,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        member: {
          select: {
            id: true
          }
        }
      },
    });

    if (!donorUser) {
      throw new AppError(
        'Usuário doador não encontrado ou inativo nesta igreja.',
        422,
        'INVALID_DONOR_USER'
      );
    }
  }

  if (data.donorMemberId) {
    const member = await prisma.member.findFirst({
      where: {
        id: data.donorMemberId,
        churchId: actor.churchId
      }
    });

    if (!member) {
      throw new AppError(
        'Membro informado não encontrado.',
        422,
        'INVALID_MEMBER'
      );
    }

    if (
      donorUser?.member?.id &&
      donorUser.member.id !== member.id
    ) {
      throw new AppError(
        'O membro selecionado não corresponde ao usuário doador.',
        422,
        'DONOR_LINK_MISMATCH'
      );
    }
  }

  const donation = await prisma.donation.create({
    data: {
      ...data,
      donorName: donorUser?.name || data.donorName,
      donorMemberId:
        data.donorMemberId || donorUser?.member?.id || undefined,
      date: new Date(data.date),
      churchId: actor.churchId,
      status: 'registered',
      donorUserId: donorUser?.id || undefined
    },
    include: donationInclude,
  });

  await prisma.donationStatusHistory.create({
    data: {
      churchId: actor.churchId,
      donationId: donation.id,
      changedById: actor.id,
      toStatus: 'registered',
      amount: data.amount,
      quantity: data.quantity,
      note: data.notes
    }
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation.registered',
    module: 'donations',
    targetId: donation.id,
    metadata: {
      amount: data.amount,
      type: data.type
    },
    ipAddress,
  });

  return donation;
}

export async function deleteDonation(id, actor, ipAddress) {
  const donation = await prisma.donation.findFirst({
    where: {
      id,
      churchId: actor.churchId
    }
  });

  if (!donation) {
    throw new AppError(
      'Doação não encontrada.',
      404,
      'NOT_FOUND'
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        relatedType: 'donation',
        relatedId: id
      }
    });

    await tx.reminderLog.deleteMany({
      where: {
        churchId: actor.churchId,
        sourceType: 'donation',
        sourceId: id
      }
    });

    await tx.donation.delete({
      where: { id }
    });
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation.deleted',
    module: 'donations',
    targetId: id,
    metadata: {
      status: donation.status,
      amount: donation.amount,
      campaignId: donation.campaignId
    },
    ipAddress
  });
}

// Doação SEMPRE muda de status de forma explícita (registrada →
// confirmada/cancelada) — nunca é editada livremente depois de criada,
// pra manter rastreabilidade financeira.
export async function updateDonationStatus(
  id,
  status,
  actor,
  ipAddress,
  details = {}
) {
  const existing = await prisma.donation.findFirst({
    where: {
      id,
      churchId: actor.churchId
    }
  });

  if (!existing) {
    throw new AppError(
      'Doação não encontrada.',
      404,
      'NOT_FOUND'
    );
  }

  if (existing.status !== 'registered') {
    throw new AppError(
      'Somente doações pendentes podem ter o status alterado.',
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.update({
      where: { id },
      data: {
        status,
        ...(details.amount !== undefined
          ? { amount: details.amount }
          : {}),
        ...(details.quantity !== undefined
          ? { quantity: details.quantity }
          : {}),
        ...(details.notes !== undefined
          ? { notes: details.notes }
          : {}),
      },
      include: donationInclude
    });

    await tx.donationStatusHistory.create({
      data: {
        churchId: actor.churchId,
        donationId: id,
        changedById: actor.id,
        fromStatus: existing.status,
        toStatus: status,
        amount: details.amount ?? existing.amount,
        quantity: details.quantity ?? existing.quantity,
        note: details.notes
      }
    });

    return donation;
  });

  if (existing.donorUserId) {
    const statusLabel = {
      confirmed: 'confirmada',
      cancelled: 'cancelada',
      registered: 'pendente'
    }[status];

    await createNotificationForMany(
      [existing.donorUserId],
      {
        churchId: actor.churchId,
        type: 'donation',
        title: `Doação ${statusLabel}`,
        body: `Sua intenção de doação foi ${statusLabel} pela equipe da igreja.`,
        relatedType: 'donation',
        relatedId: id,
      }
    );
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation.status_changed',
    module: 'donations',
    targetId: id,
    metadata: { status },
    ipAddress,
  });

  return updated;
}

export async function sendDonationReminder(id, actor, ipAddress) {
  const donation = await prisma.donation.findFirst({
    where: {
      id,
      churchId: actor.churchId
    },
    include: donationInclude
  });

  if (!donation) {
    throw new AppError(
      'Doação não encontrada.',
      404,
      'NOT_FOUND'
    );
  }

  if (donation.status !== 'registered') {
    throw new AppError(
      'Só é possível lembrar contribuições pendentes.',
      409,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (!donation.donorUserId) {
    throw new AppError(
      'Esta contribuição não está vinculada a uma conta para receber notificações.',
      422,
      'NO_RECIPIENT'
    );
  }

  const since = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );

  const recent = await prisma.reminderLog.findFirst({
    where: {
      churchId: actor.churchId,
      sourceType: 'donation',
      sourceId: id,
      sentAt: { gte: since }
    }
  });

  if (recent) {
    throw new AppError(
      'Já foi enviado um lembrete para esta contribuição nas últimas 24 horas.',
      429,
      'REMINDER_COOLDOWN'
    );
  }

  await createNotificationForMany(
    [donation.donorUserId],
    {
      churchId: actor.churchId,
      type: 'donation',
      title: 'Lembrete de contribuição pendente',
      body: `Sua contribuição para ${donation.campaign?.name || 'a igreja'} ainda aguarda confirmação.`,
      relatedType: 'donation',
      relatedId: id,
      link: '/participar-doacoes'
    }
  );

  await prisma.reminderLog.create({
    data: {
      churchId: actor.churchId,
      recipientId: donation.donorUserId,
      actorId: actor.id,
      sourceType: 'donation',
      sourceId: id,
      automatic: false
    }
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation.reminder_sent',
    module: 'donations',
    targetId: id,
    metadata: {
      recipientId: donation.donorUserId,
      automatic: false
    },
    ipAddress
  });

  return { sent: true };
}

export async function sendAutomaticDonationReminders() {
  const dueBefore = new Date(
    Date.now() - 5 * 24 * 60 * 60 * 1000
  );

  const cooldown = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const pending = await prisma.donation.findMany({
    where: {
      status: 'registered',
      donorUserId: { not: null },
      createdAt: { lte: dueBefore }
    },
    include: {
      campaign: {
        select: {
          name: true
        }
      }
    },
    take: 100
  });

  for (const donation of pending) {
    const prior = await prisma.reminderLog.findFirst({
      where: {
        churchId: donation.churchId,
        sourceType: 'donation',
        sourceId: donation.id,
        automatic: true,
        sentAt: { gte: cooldown }
      }
    });

    if (prior) continue;

    await createNotificationForMany(
      [donation.donorUserId],
      {
        churchId: donation.churchId,
        type: 'donation',
        title: 'Lembrete de contribuição pendente',
        body: `Sua contribuição para ${donation.campaign?.name || 'a igreja'} ainda aguarda confirmação.`,
        relatedType: 'donation',
        relatedId: donation.id,
        link: '/participar-doacoes'
      }
    );

    await prisma.reminderLog.create({
      data: {
        churchId: donation.churchId,
        recipientId: donation.donorUserId,
        sourceType: 'donation',
        sourceId: donation.id,
        automatic: true
      }
    });
  }
}

export async function listCampaignExpenses(campaignId, churchId) {
  const campaign = await prisma.donationCampaign.findFirst({
    where: {
      id: campaignId,
      churchId
    },
    select: {
      id: true
    }
  });

  if (!campaign) {
    throw new AppError(
      'Campanha não encontrada.',
      404,
      'NOT_FOUND'
    );
  }

  return prisma.campaignExpense.findMany({
    where: {
      campaignId,
      churchId
    },
    orderBy: {
      date: 'desc'
    }
  });
}

export async function createCampaignExpense(
  campaignId,
  data,
  actor,
  ipAddress
) {
  const campaign = await prisma.donationCampaign.findFirst({
    where: {
      id: campaignId,
      churchId: actor.churchId
    }
  });

  if (!campaign) {
    throw new AppError(
      'Campanha não encontrada.',
      404,
      'NOT_FOUND'
    );
  }

  const expense = await prisma.campaignExpense.create({
    data: {
      ...data,
      campaignId,
      churchId: actor.churchId,
      date: data.date ? new Date(data.date) : new Date(),
      createdById: actor.id
    }
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation_campaign.expense_created',
    module: 'donations',
    targetId: expense.id,
    metadata: {
      campaignId,
      amount: data.amount
    },
    ipAddress
  });

  return expense;
}

export async function transferCampaignToFinance(
  campaignId,
  data,
  actor,
  ipAddress
) {
  const transfer = await prisma.$transaction(
    async (tx) => {
      const campaign = await tx.donationCampaign.findFirst({
        where: {
          id: campaignId,
          churchId: actor.churchId
        }
      });

      if (!campaign) {
        throw new AppError(
          'Campanha não encontrada.',
          404,
          'NOT_FOUND'
        );
      }

      if (data.categoryId) {
        const category = await tx.financialCategory.findFirst({
          where: {
            id: data.categoryId,
            churchId: actor.churchId,
            type: 'income'
          }
        });

        if (!category) {
          throw new AppError(
            'Categoria de receita inválida.',
            422,
            'INVALID_CATEGORY'
          );
        }
      }

      const confirmed = await tx.donation.aggregate({
        where: {
          churchId: actor.churchId,
          campaignId,
          status: 'confirmed',
          kind: 'money'
        },
        _sum: {
          amount: true
        }
      });

      const expenses = await tx.campaignExpense.aggregate({
        where: {
          churchId: actor.churchId,
          campaignId
        },
        _sum: {
          amount: true
        }
      });

      const alreadyTransferred =
        await tx.campaignFinanceTransfer.aggregate({
          where: {
            churchId: actor.churchId,
            campaignId
          },
          _sum: {
            amount: true
          }
        });

      const available =
        Number(confirmed._sum.amount || 0) -
        Number(expenses._sum.amount || 0) -
        Number(alreadyTransferred._sum.amount || 0);

      if (data.amount > available) {
        throw new AppError(
          `O valor supera o saldo confirmado disponível (R$ ${available.toFixed(2)}).`,
          422,
          'INSUFFICIENT_CAMPAIGN_BALANCE'
        );
      }

      const date = data.date
        ? new Date(data.date)
        : new Date();

      const entry = await tx.financialEntry.create({
        data: {
          churchId: actor.churchId,
          type: 'income',
          categoryId: data.categoryId,
          description: `Repasse da campanha: ${campaign.name}`,
          amount: data.amount,
          date,
          status: 'paid',
          notes: data.notes
        }
      });

      const record =
        await tx.campaignFinanceTransfer.create({
          data: {
            churchId: actor.churchId,
            campaignId,
            financialEntryId: entry.id,
            amount: data.amount,
            date,
            reference: data.reference,
            notes: data.notes,
            createdById: actor.id
          }
        });

      return {
        transfer: record,
        financialEntry: entry
      };
    },
    {
      isolationLevel: 'Serializable'
    }
  );

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'donation_campaign.finance_transfer',
    module: 'donations',
    targetId: transfer.transfer.id,
    metadata: {
      campaignId,
      amount: data.amount,
      financialEntryId: transfer.financialEntry.id
    },
    ipAddress
  });

  return transfer;
}
