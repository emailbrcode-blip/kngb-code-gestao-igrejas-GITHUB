import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import {
  getMembersReportRequest,
  getWorkerParticipationReportRequest,
  getFinancialReportRequest,
  getDonationsReportRequest,
  downloadPdf,
} from '../../lib/reportsService';
import { PdfReports } from './PdfReports';

const STATUS_LABEL = { active: 'Ativos', inactive: 'Inativos', visitor: 'Visitantes', transferred: 'Transferidos', away: 'Afastados' };

export function Reports() {
  const { hasPermission } = useAuthStore();
  const [membersReport, setMembersReport] = useState(null);
  const [participationReport, setParticipationReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [donationsReport, setDonationsReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    async function load() {
      const tasks = [];
      if (hasPermission('members.view')) tasks.push(getMembersReportRequest().then(setMembersReport));
      if (hasPermission('workers.view')) tasks.push(getWorkerParticipationReportRequest().then(setParticipationReport));
      if (hasPermission('finance.view')) tasks.push(getFinancialReportRequest().then(setFinancialReport));
      if (hasPermission('donations.view')) tasks.push(getDonationsReportRequest().then(setDonationsReport));
      await Promise.all(tasks);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDownload(key, path, filename) {
    setDownloading(key);
    try { await downloadPdf(path, filename); }
    finally { setDownloading(''); }
  }

  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl font-medium text-ink">Relatórios</h1>
      <p className="mt-1 text-sm text-ink/60">Membros, obreiros, financeiro e doações.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {membersReport && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink/70">Membros</p>
              <button
                onClick={() => handleDownload('members', '/pdf/members', 'relatorio-membros.pdf')}
                disabled={downloading === 'members'}
                className="text-xs font-medium text-coal hover:underline"
              >
                {downloading === 'members' ? 'gerando…' : 'baixar PDF'}
              </button>
            </div>
            <p className="mt-2 font-display text-2xl text-ink">{membersReport.total}</p>
            <div className="mt-2 space-y-1 text-sm text-ink/60">
              {membersReport.byStatus.map((s) => (
                <div key={s.status} className="flex justify-between">
                  <span>{STATUS_LABEL[s.status] || s.status}</span>
                  <span>{s._count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {participationReport && (
          <Card>
            <p className="text-sm font-medium text-ink/70">Participação de obreiros</p>
            <p className="mt-1 text-xs text-ink/40">Indicador administrativo de distribuição de escala — não é um ranking de "melhor obreiro".</p>
            <div className="mt-3 space-y-1.5 text-sm">
              {participationReport.slice(0, 8).map((p) => (
                <div key={p.workerId} className="flex justify-between">
                  <span className="text-ink">{p.name}</span>
                  <span className="text-ink/50">{p.totalAssignments} escalas ({p.confirmed} confirmadas)</span>
                </div>
              ))}
              {participationReport.length === 0 && <p className="text-ink/40">Nenhum obreiro com escalas ainda.</p>}
            </div>
          </Card>
        )}

        {financialReport && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink/70">Financeiro</p>
              <button
                onClick={() => handleDownload('financial', '/pdf/financial', 'relatorio-financeiro.pdf')}
                disabled={downloading === 'financial'}
                className="text-xs font-medium text-coal hover:underline"
              >
                {downloading === 'financial' ? 'gerando…' : 'baixar PDF'}
              </button>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-ink/50">Receitas</span><span className="text-success">R$ {financialReport.income.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-ink/50">Despesas</span><span className="text-danger">R$ {financialReport.expense.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium"><span className="text-ink/70">Saldo</span><span className="text-ink">R$ {financialReport.balance.toFixed(2)}</span></div>
            </div>
          </Card>
        )}

        {donationsReport && (
          <Card>
            <p className="text-sm font-medium text-ink/70">Doações confirmadas</p>
            <p className="mt-2 font-display text-2xl text-ink">R$ {donationsReport.totalAmount.toFixed(2)}</p>
            <div className="mt-2 space-y-1 text-sm text-ink/60">
              {donationsReport.byType.map((t) => (
                <div key={t.type} className="flex justify-between">
                  <span className="capitalize">{t.type}</span>
                  <span>R$ {t.amount.toFixed(2)} ({t.count})</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {!membersReport && !participationReport && !financialReport && !donationsReport && (
        <Card className="mt-6">
          <p className="text-sm text-ink/50">Nenhum relatório disponível para o seu perfil de acesso.</p>
        </Card>
      )}

      <PdfReports />

      <Card className="mt-4">
        <p className="text-sm text-ink/50">
          Relatórios de escalas, eventos e aniversariantes por mês já têm endpoint pronto
          (<code>/reports/schedules</code>, <code>/reports/birthdays</code>) — telas dedicadas para eles
          ficam para a próxima passada, junto com exportação CSV.
        </p>
      </Card>
    </div>
  );
}
