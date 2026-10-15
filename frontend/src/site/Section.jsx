const cx = (...c) => c.filter(Boolean).join(' ');

export function Section({ id, children, tone = 'default', className = '' }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cx(
        'py-16 md:py-28',
        tone === 'muted' && 'bg-site-secondary',
        tone === 'ink' && 'bg-site-ink text-site-ink-fg',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">{children}</div>
    </section>
  );
}

export function SectionHeader({ id, eyebrow, title, description, tone = 'default', action }) {
  const ink = tone === 'ink';
  return (
    <div className="mb-10 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-4">
        <p className={cx('flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em]', ink ? 'text-blue-300' : 'text-site-primary')}>
          <span aria-hidden="true" className="h-px w-8 bg-current" />
          {eyebrow}
        </p>
        <h2 id={`${id}-title`} className="font-serif text-3xl font-semibold leading-tight md:text-5xl">
          {title}
        </h2>
        {description && (
          <p className={cx('leading-relaxed md:text-lg', ink ? 'text-site-ink-fg/70' : 'text-site-muted-fg')}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyNote({ children, tone = 'default' }) {
  return (
    <div
      className={cx(
        'rounded-xl border border-dashed px-6 py-12 text-center text-sm',
        tone === 'ink' ? 'border-white/15 text-site-ink-fg/70' : 'border-site-border text-site-muted-fg',
      )}
    >
      {children}
    </div>
  );
}
