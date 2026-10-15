const VARIANTS = {
  primary: 'bg-coal text-white hover:bg-coal-light disabled:bg-coal/40',
  metal: 'bg-metal text-coal-dark hover:bg-metal-light disabled:bg-metal/40',
  ghost: 'border border-ink/15 text-ink hover:bg-ink/5 disabled:opacity-40',
  danger: 'border border-danger/30 text-danger hover:bg-danger/5 disabled:opacity-40',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
