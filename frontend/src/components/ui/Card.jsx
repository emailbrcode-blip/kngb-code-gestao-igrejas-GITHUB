export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-ink/10 bg-white p-5 ${className}`}>{children}</div>
  );
}
