const TONES = {
  neutral: 'bg-ink/10 text-ink/60',
  success: 'bg-success/10 text-success',
  warning: 'bg-metal/20 text-metal-dark',
  danger: 'bg-danger/10 text-danger',
};

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
