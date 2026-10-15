import { useEffect, useState } from 'react';
import { useInstallPrompt } from './useInstallPrompt';
import { BRAND, STORAGE_PREFIX } from '../config/brand';
import { useChurchName } from '../hooks/useChurchName';

const DISMISS_KEY = `${STORAGE_PREFIX}:install-banner-dismissed`;

export function InstallBanner() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const churchName = useChurchName();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  // Só considera mostrar um pouco depois do carregamento — evita
  // "piscar" o banner antes do navegador decidir se oferece o evento.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!ready || installed || dismissed || !canInstall) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    // Se a pessoa recusar no prompt nativo do navegador, também
    // respeitamos isso e não insistimos de novo na mesma sessão.
    if (outcome === 'dismissed') handleDismiss();
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-xl border border-ink/10 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4">
      <div className="flex items-center gap-3"><img src="/brand/cruz.png" alt="" className="h-10 w-10 rounded-lg object-contain" /><p className="font-display text-base font-medium text-ink">{churchName || BRAND.short}</p></div>
      <p className="mt-2 text-sm text-ink/60">{churchName ? `Tenha acesso rápido a ${churchName} pelo seu celular.` : 'Instale o aplicativo para ter acesso rápido pelo seu celular.'}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-coal px-3.5 py-2 text-sm font-medium text-white hover:bg-coal-light"
        >
          Instalar aplicativo
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink/50 hover:text-ink"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
