import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { listAuditLogsRequest } from '../../lib/auditService';

export function Audit() {
  const { hasPermission } = useAuthStore();
  const [data, setData] = useState({ logs: [], total: 0 }); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setLoading(true); try { setData(await listAuditLogsRequest({ page: 1, pageSize: 50 })); } finally { setLoading(false); } })(); }, []);
  if (!hasPermission('audit.view')) return <EmptyState message="Você não possui permissão para visualizar a auditoria." />;
  return <div className="max-w-6xl"><h1 className="font-display text-2xl font-medium text-ink">Auditoria</h1><p className="mt-1 text-sm text-ink/60">Histórico das ações registradas no sistema.</p>
    <Card className="mt-5 overflow-hidden !p-0">{loading ? <Loading/> : data.logs.length===0 ? <EmptyState message="Nenhum registro de auditoria."/> : <div className="divide-y divide-ink/5">{data.logs.map(log=><div key={log.id} className="grid gap-1 px-5 py-4 md:grid-cols-[180px_1fr_180px]"><div className="text-xs text-ink/40">{new Date(log.createdAt).toLocaleString('pt-BR')}</div><div><p className="text-sm font-medium text-ink">{log.action}</p><p className="text-xs text-ink/50">Módulo: {log.module}{log.targetId ? ` · ID: ${log.targetId}` : ''}</p></div><div className="text-xs text-ink/50">{log.user?.name || 'Sistema'}</div></div>)}</div>}</Card>
  </div>;
}
