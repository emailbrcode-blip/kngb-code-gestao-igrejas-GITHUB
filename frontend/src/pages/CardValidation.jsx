import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

// Página PÚBLICA aberta pelo QR Code da carteirinha. Mostra só o mínimo para conferência.
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

export function CardValidation() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, card: null, error: '' });

  useEffect(() => {
    document.title = 'Validação de carteirinha';
    api.get(`/public/cards/${encodeURIComponent(code)}`)
      .then((r) => setState({ loading: false, card: r.data.card, error: '' }))
      .catch((err) => setState({ loading: false, card: null, error: err?.response?.status === 404 ? 'Carteirinha não encontrada.' : err?.response?.status === 429 ? 'Muitas consultas. Tente novamente em instantes.' : 'Não foi possível validar agora. Tente novamente.' }));
  }, [code]);

  const { card } = state;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] bg-gradient-to-br from-black via-[#111111] to-[#2a2a2a] p-5">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-[#111111] px-6 py-5 text-center text-white">
          <img src="/brand/cruz.png" alt="" className="mx-auto h-14 w-14 rounded-xl" />
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/60">Carteirinha de membro</p>
          <h1 className="font-display text-xl">{card?.church || 'Validação'}</h1>
        </div>
        <div className="p-6" aria-live="polite">
          {state.loading && <p className="text-center text-sm text-ink/60">Validando…</p>}
          {state.error && <p role="alert" className="text-center text-sm text-danger">{state.error}</p>}
          {card && (
            <>
              <p className={`rounded-xl px-4 py-3 text-center text-lg font-semibold ${card.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {card.valid ? '✔ Carteirinha válida' : '✖ Carteirinha inválida'}
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="text-xs uppercase tracking-wide text-ink/50">Titular</dt><dd className="text-base font-medium text-ink">{card.name}</dd></div>
                <div className="flex justify-between gap-4"><div><dt className="text-xs uppercase tracking-wide text-ink/50">Registro</dt><dd className="font-medium">{card.rma}</dd></div><div className="text-right"><dt className="text-xs uppercase tracking-wide text-ink/50">Categoria</dt><dd className="font-medium">{card.category}</dd></div></div>
                <div className="flex justify-between gap-4"><div><dt className="text-xs uppercase tracking-wide text-ink/50">Situação</dt><dd className="font-medium">{card.status}</dd></div><div className="text-right"><dt className="text-xs uppercase tracking-wide text-ink/50">Emitida em</dt><dd className="font-medium">{fmt(card.issuedAt)}</dd></div></div>
              </dl>
              {!card.valid && <p className="mt-4 text-xs text-ink/60">Esta carteirinha não está ativa. Procure a secretaria da igreja.</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
