export function EmptyState({ message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-ink/40">{message}</p>
      {action}
    </div>
  );
}
