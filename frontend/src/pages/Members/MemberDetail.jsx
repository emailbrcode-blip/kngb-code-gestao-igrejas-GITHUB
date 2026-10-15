import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMemberRequest, getMemberCardPdf, getMemberPdf } from '../../lib/membersService';
import { downloadCardPdf, formatRma } from '../../lib/cardDownload';
import {
  listEcclesiasticalRolesRequest,
  getMemberEcclesiasticalHistoryRequest,
  assignEcclesiasticalRoleToMemberRequest,
} from '../../lib/ecclesiasticalRolesService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatDateBR } from '../../lib/dateUtils';
import { AssignEcclesiasticalRoleModal } from './AssignEcclesiasticalRoleModal';

const STATUS_LABELS = { active: 'Ativo', inactive: 'Inativo', visitor: 'Visitante', transferred: 'Transferido', away: 'Afastado' };
const STATUS_TONE = { active: 'success', inactive: 'neutral', visitor: 'warning', transferred: 'neutral', away: 'neutral' };

export function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [member, setMember] = useState(null);
  const [history, setHistory] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [cardError, setCardError] = useState('');
  const [cardWarning, setCardWarning] = useState('');

  const canEdit = hasPermission('members.edit');

  async function loadAll() {
    const [m, h, r] = await Promise.all([
      getMemberRequest(id),
      getMemberEcclesiasticalHistoryRequest(id),
      listEcclesiasticalRolesRequest(),
    ]);
    setMember(m); setHistory(h); setRoles(r);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  async function handleAssign(payload) {
    setSubmitting(true); setFormError('');
    try {
      await assignEcclesiasticalRoleToMemberRequest(id, payload);
      setShowAssign(false);
      await loadAll();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível atribuir o cargo.');
    } finally { setSubmitting(false); }
  }

  async function downloadCard() {
    setCardError(''); setCardWarning('');
    try {
      const r = await downloadCardPdf(getMemberCardPdf, id, `carteirinha-${formatRma(member.rmaNumber)}`);
      if (r.photoStatus !== 'ok') setCardWarning(`Carteirinha gerada sem a foto: ${r.photoMessage || 'foto indisponível'}`);
    } catch (err) { setCardError(err?.response?.status === 403 ? 'Você não tem permissão para emitir carteirinhas.' : 'Não foi possível gerar a carteirinha.'); }
  }

  async function downloadPdf(fetchPdf, filename) {
    setCardError('');
    try {
      const response = await fetchPdf(id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = `${filename}-${id}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch { setCardError('Não foi possível gerar o PDF solicitado.'); }
  }

  if (loading) return <Loading />;
  if (!member) return <p className="text-sm text-ink/50">Membro não encontrado.</p>;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-ink/50 hover:text-ink">← Voltar</button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-medium text-ink">{member.fullName}</h1><Button variant="ghost" onClick={() => downloadPdf(getMemberPdf, 'ficha-membro')}>Ficha PDF</Button><Button variant="ghost" onClick={downloadCard}>Carteirinha PDF</Button></div>
        <Badge tone={STATUS_TONE[member.status]}>{STATUS_LABELS[member.status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink/60">{formatRma(member.rmaNumber)}</p>
      {cardError && <p role="alert" className="mt-2 text-sm text-danger">{cardError}</p>}
      {cardWarning && <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{cardWarning}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-ink/70">Dados pessoais</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Nascimento</dt><dd>{formatDateBR(member.birthDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Endereço</dt><dd className="text-right">{member.address || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <p className="text-sm font-medium text-ink/70">Contato</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Telefone</dt><dd>{member.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">WhatsApp</dt><dd>{member.whatsapp || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">E-mail</dt><dd>{member.email || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <p className="text-sm font-medium text-ink/70">Informações da igreja</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Entrada</dt><dd>{formatDateBR(member.joinDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Saída</dt><dd>{member.exitDate ? formatDateBR(member.exitDate) : (member.status === 'active' ? 'Não se aplica' : '—')}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Ministério</dt><dd>{member.ministry || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Grupo</dt><dd>{member.groupName || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink/70">Cargo eclesiástico</p>
            {canEdit && <button onClick={() => setShowAssign(true)} className="text-xs font-medium text-coal hover:underline">atribuir</button>}
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink/40">Nenhum cargo atribuído ainda.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between">
                  <span className={h.endDate ? 'text-ink/40' : 'font-medium text-ink'}>{h.ecclesiasticalRole.name}</span>
                  <span className="text-xs text-ink/40">
                    {formatDateBR(h.startDate)} {h.endDate ? `– ${formatDateBR(h.endDate)}` : '– atual'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {(member.responsible || member.dependents?.length > 0) && (
          <Card>
            <p className="text-sm font-medium text-ink/70">Responsável/Dependentes</p>
            <div className="mt-3 space-y-2 text-sm">
              {member.responsible && (
                <p><span className="text-ink/50">Responsável: </span>
                  <Link to={`/membros/${member.responsible.id}`} className="text-coal hover:underline">{member.responsible.fullName}</Link>
                </p>
              )}
              {member.dependents?.map((d) => (
                <p key={d.id}><span className="text-ink/50">Dependente: </span>
                  <Link to={`/membros/${d.id}`} className="text-coal hover:underline">{d.fullName}</Link>
                </p>
              ))}
            </div>
          </Card>
        )}
      </div>

      {member.notes && (
        <Card className="mt-4">
          <p className="text-sm font-medium text-ink/70">Observações</p>
          <p className="mt-2 text-sm text-ink/70">{member.notes}</p>
        </Card>
      )}

      {showAssign && (
        <AssignEcclesiasticalRoleModal
          roles={roles}
          onClose={() => setShowAssign(false)}
          onSubmit={handleAssign}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  );
}
