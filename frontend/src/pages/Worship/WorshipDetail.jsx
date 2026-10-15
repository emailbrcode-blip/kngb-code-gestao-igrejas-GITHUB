import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorshipRequest, saveSermonRequest, addSongRequest, removeSongRequest, deleteWorshipRequest } from '../../lib/worshipsService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatDateLongBR } from '../../lib/dateUtils';

export function WorshipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [worship, setWorship] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sermonForm, setSermonForm] = useState({ preacherName: '', title: '', scripture: '', theme: '', summary: '' });
  const [savingSermon, setSavingSermon] = useState(false);
  const [songTitle, setSongTitle] = useState('');

  async function load() {
    const w = await getWorshipRequest(id);
    setWorship(w);
    setSermonForm({
      preacherName: w.sermon?.preacherName || '',
      title: w.sermon?.title || '',
      scripture: w.sermon?.scripture || '',
      theme: w.sermon?.theme || '',
      summary: w.sermon?.summary || '',
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSaveSermon(e) {
    e.preventDefault();
    setSavingSermon(true);
    try { await saveSermonRequest(id, sermonForm); await load(); }
    finally { setSavingSermon(false); }
  }

  async function handleAddSong(e) {
    e.preventDefault();
    if (!songTitle.trim()) return;
    await addSongRequest(id, { title: songTitle, position: (worship.songs?.length || 0) + 1 });
    setSongTitle('');
    load();
  }
  async function handleDelete() {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    await deleteWorshipRequest(id); navigate('/cultos', { replace: true });
  }

  if (loading) return <Loading />;
  if (!worship) return <p className="text-sm text-ink/50">Culto não encontrado.</p>;

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-sm text-ink/50 hover:text-ink">← Voltar</button>

      <h1 className="mt-3 font-display text-2xl font-medium text-ink">{worship.theme || 'Culto'}</h1>
      <p className="mt-1 text-sm capitalize text-ink/60">
        {formatDateLongBR(worship.date)}{worship.startTime && ` às ${worship.startTime}`}
        {worship.attendanceCount != null && ` — ${worship.attendanceCount} presentes`}
      </p>
      {hasPermission('worships.delete') && <Button variant="danger" className="mt-4" onClick={handleDelete}>Excluir culto</Button>}

      <Card className="mt-6">
        <p className="text-sm font-medium text-ink/70">Palavra</p>
        <form onSubmit={handleSaveSermon} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Pregador" value={sermonForm.preacherName}
              onChange={(e) => setSermonForm((f) => ({ ...f, preacherName: e.target.value }))}
              className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
            <input placeholder="Título" value={sermonForm.title}
              onChange={(e) => setSermonForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
          <input placeholder="Texto bíblico (ex: João 3:16)" value={sermonForm.scripture}
            onChange={(e) => setSermonForm((f) => ({ ...f, scripture: e.target.value }))}
            className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          <textarea placeholder="Resumo" rows={2} value={sermonForm.summary}
            onChange={(e) => setSermonForm((f) => ({ ...f, summary: e.target.value }))}
            className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          <Button type="submit" disabled={savingSermon} variant="ghost">{savingSermon ? 'Salvando…' : 'Salvar palavra'}</Button>
        </form>
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-medium text-ink/70">Louvor — repertório</p>
        <div className="mt-3 space-y-1.5">
          {(worship.songs || []).length === 0 && <p className="text-sm text-ink/40">Nenhuma música registrada.</p>}
          {worship.songs?.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-ink/[0.03] px-3 py-2 text-sm">
              <span>{s.position ? `${s.position}. ` : ''}{s.title}</span>
              <button onClick={() => removeSongRequest(id, s.id).then(load)} className="text-xs text-ink/30 hover:text-danger">remover</button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddSong} className="mt-3 flex gap-2">
          <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Nome da música"
            className="flex-1 rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          <Button type="submit" variant="ghost">Adicionar</Button>
        </form>
      </Card>
    </div>
  );
}
