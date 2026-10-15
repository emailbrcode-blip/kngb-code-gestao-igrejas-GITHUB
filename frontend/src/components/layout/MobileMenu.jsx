import { useState } from 'react';
import { SidebarContent } from './Sidebar';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-ink/5 md:hidden"
      >
        <span className={`h-0.5 w-5 bg-ink transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
        <span className={`h-0.5 w-5 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-5 bg-ink transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-coal shadow-xl">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
