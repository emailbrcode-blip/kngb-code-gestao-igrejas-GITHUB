export function Loading({ label = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-ink/40">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-coal" />
      {label}
    </div>
  );
}
