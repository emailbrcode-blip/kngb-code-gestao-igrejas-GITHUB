import { useEffect, useState } from 'react';
import { Button } from './ui/Button';

// Campo de fotografia por URL (Supabase Storage). Mostra prévia, trata link inválido
// e imagem indisponível, e permite remover. A imagem NUNCA é guardada no banco:
// só o link fica no cadastro.
function urlProblem(url) {
  if (!url) return '';
  let u;
  try { u = new URL(url.trim()); } catch { return 'Link inválido.'; }
  if (u.protocol !== 'https:') return 'O link deve começar com https://';
  if (!u.hostname.endsWith('.supabase.co') && !u.hostname.endsWith('.supabase.in')) return 'Use o link público da foto no Supabase Storage (endereço terminado em .supabase.co).';
  if (/\.webp(\?|$)/i.test(u.pathname + u.search)) return 'WebP não é aceito na carteirinha — envie a foto em JPG ou PNG.';
  return '';
}

export function PhotoField({ value, onChange, canRemove = true }) {
  const [draft, setDraft] = useState(value || '');
  const [shown, setShown] = useState(value || '');
  const [state, setState] = useState(value ? 'loading' : 'idle'); // idle | loading | ok | error
  useEffect(() => { setDraft(value || ''); }, [value]);

  const problem = urlProblem(draft);
  function load() {
    const next = draft.trim();
    onChange(next);
    setShown(next);
    setState(next && !urlProblem(next) ? 'loading' : next ? 'error' : 'idle');
  }
  function remove() { setDraft(''); setShown(''); setState('idle'); onChange(''); }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink/80" htmlFor="photo-url">Fotografia (link da imagem)</label>
      <div className="flex gap-3">
        <div className="relative h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-lg border border-ink/15 bg-ink/5">
          {shown && !urlProblem(shown) && state !== 'error' ? (
            <img src={shown} alt="Prévia da fotografia" className="h-full w-full object-cover"
              onLoad={() => setState('ok')} onError={() => setState('error')} />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-ink/40">
              {state === 'error' ? 'Imagem indisponível' : 'Sem foto'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input id="photo-url" type="url" inputMode="url" value={draft} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value.trim()); }}
            onBlur={load} placeholder="https://….supabase.co/storage/v1/object/public/…"
            className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={load}>{value ? 'Atualizar foto' : 'Carregar foto'}</Button>
            {canRemove && (draft || value) && <Button type="button" variant="ghost" onClick={remove}>Remover foto</Button>}
          </div>
        </div>
      </div>
      {problem && draft && <p role="alert" className="text-xs text-danger">{problem}</p>}
      {!problem && state === 'error' && <p role="alert" className="text-xs text-danger">Não foi possível carregar a imagem. Confira se o link é público e se o arquivo ainda existe.</p>}
      {!draft && <p className="text-xs text-ink/50">Envie a foto ao Supabase Storage, copie a URL pública e cole aqui. Pode salvar o cadastro sem foto.</p>}
    </div>
  );
}
