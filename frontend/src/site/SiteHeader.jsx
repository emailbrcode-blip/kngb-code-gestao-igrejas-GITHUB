import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

export function SiteLogo({ logoUrl, name, tone = 'dark' }) {
  const light = tone === 'light';
  return (
    <span className="flex items-center gap-3">
      <SiteLogoMark logoUrl={logoUrl} name={name} tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={cx('font-serif text-lg font-semibold', light ? 'text-white' : 'text-site-fg')}>{name || 'Nossa igreja'}</span>
      </span>
    </span>
  );
}

export function SiteLogoMark({ logoUrl, name, tone = 'dark', className = 'size-10' }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name || 'Logo da igreja'} className={cx('object-contain', className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full border',
        tone === 'dark' ? 'border-site-primary/20 bg-site-primary text-white' : 'border-white/30 bg-white/10 text-white',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-1/2" fill="currentColor">
        <path d="M10.75 2h2.5v6h5.25v2.5h-5.25V22h-2.5V10.5H5.5V8h5.25z" />
      </svg>
    </span>
  );
}

export function SiteHeader({ extras, navItems }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const tone = scrolled ? 'dark' : 'light';
  const desktopItems = navItems.filter((i) => i.href !== '#inicio' && i.href !== '#contato');

  return (
    <header className={cx('fixed inset-x-0 top-0 z-50 transition-colors duration-300', scrolled ? 'border-b border-site-border bg-white/90 backdrop-blur-md' : 'bg-transparent')}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-6 px-5 md:px-8">
        <a href="#inicio" aria-label={`${extras.siteName} — Início`}>
          <SiteLogo logoUrl={extras.logoUrl} name={extras.siteName} tone={tone} />
        </a>

        <nav aria-label="Navegação principal" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {desktopItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cx('rounded-md px-3 py-2 text-sm font-medium transition-colors', scrolled ? 'text-site-fg/75 hover:text-site-primary' : 'text-white/80 hover:text-white')}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#contato"
            className={cx('hidden rounded-full px-5 py-2.5 text-sm font-medium transition-colors sm:inline-flex', scrolled ? 'bg-site-primary text-white hover:bg-site-primary/90' : 'bg-white text-site-ink hover:bg-white/90')}
          >
            Contato
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className={cx('flex size-11 items-center justify-center rounded-full transition-colors xl:hidden', scrolled ? 'text-site-fg hover:bg-site-muted' : 'text-white hover:bg-white/10')}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm animate-site-sheet flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-site-border p-4">
              <SiteLogo logoUrl={extras.logoUrl} name={extras.siteName} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="flex size-11 items-center justify-center rounded-full hover:bg-site-muted">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Navegação móvel" className="flex-1 overflow-y-auto px-4 py-3">
              <ul className="flex flex-col">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-3.5 font-serif text-lg text-site-fg transition-colors hover:bg-site-muted hover:text-site-primary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
