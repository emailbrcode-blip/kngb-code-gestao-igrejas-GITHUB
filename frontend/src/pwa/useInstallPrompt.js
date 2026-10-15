import { useEffect, useState } from 'react';

function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // Safari/iOS
  );
}

// Único ponto de captura do evento beforeinstallprompt — o botão do
// menu e o banner de instalação usam este mesmo hook, nunca duas
// implementações escutando o evento separadamente (o navegador só
// dispara isso uma vez por carregamento de página).
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isRunningStandalone());

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null); // o prompt só pode ser usado uma vez
    return outcome;
  }

  return {
    // Só mostra "instalar" quando o navegador realmente ofereceu o
    // evento — nunca um botão que não funciona (iOS não dispara esse
    // evento; lá a instalação é manual pelo menu Compartilhar do Safari).
    canInstall: Boolean(deferredPrompt) && !installed,
    installed,
    promptInstall,
  };
}
