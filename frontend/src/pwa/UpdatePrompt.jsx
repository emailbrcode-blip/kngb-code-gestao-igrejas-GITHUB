import { useRegisterSW } from 'virtual:pwa-register/react';

// registerType: 'prompt' no vite.config.js garante que isso nunca troca
// a versão em uso sem o usuário clicar em "Atualizar agora" — evita
// perder o meio de um formulário preenchido por causa de uma atualização
// silenciosa.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Verifica se há uma versão nova a cada 60 min de uso contínuo —
      // suficiente pra um sistema interno, sem sobrecarregar o servidor.
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-xl border border-metal/40 bg-coal p-4 shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
      <p className="text-sm font-medium text-white">Nova versão disponível</p>
      <p className="mt-1 text-xs text-white/60">Atualize para usar a versão mais recente do sistema.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="mt-3 rounded-lg bg-metal px-3.5 py-2 text-sm font-medium text-coal-dark hover:bg-metal-light"
      >
        Atualizar agora
      </button>
    </div>
  );
}
