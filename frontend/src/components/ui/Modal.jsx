import { useEffect } from 'react';

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative w-full rounded-xl bg-white p-6 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {title && <h2 className="font-display text-lg font-medium text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
