import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export function GlobalSearch() {
  const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [open, setOpen] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return undefined; }
    const timer = setTimeout(() => api.get('/search', { params: { q: query.trim() } }).then((r) => setResults(r.data.results)).catch(() => setResults([])), 250);
    return () => clearTimeout(timer);
  }, [query]);
  return <div className="relative hidden w-64 sm:block"><input aria-label="Pesquisa global" placeholder="Pesquisar…" value={query} onFocus={() => setOpen(true)} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} className="w-full rounded-lg border border-ink/10 bg-canvas px-3 py-2 text-sm outline-none focus:border-ink/30" />
    {open && query.length >= 2 && <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-auto rounded-xl border border-ink/10 bg-white shadow-lg">{results.length ? results.map((r, i) => <Link key={`${r.type}-${i}`} onClick={() => { setOpen(false); setQuery(''); }} to={r.url} className="block border-b border-ink/5 px-3 py-2.5 hover:bg-ink/5"><span className="block text-sm font-medium">{r.title}</span><span className="text-xs text-ink/50">{r.subtitle}</span></Link>) : <p className="px-3 py-4 text-sm text-ink/50">Nenhum resultado.</p>}</div>}
  </div>;
}
