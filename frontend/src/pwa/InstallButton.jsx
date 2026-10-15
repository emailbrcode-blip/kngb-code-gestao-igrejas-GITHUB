import { useInstallPrompt } from './useInstallPrompt';

const VARIANTS = {
  dark: {
    installed: 'text-white/40',
    button: 'border-white/15 text-white/80 hover:border-metal hover:text-metal-light',
  },
  light: {
    installed: 'text-ink/40',
    button: 'border-ink/15 text-ink/80 hover:border-coal hover:text-coal',
  },
};

export function InstallButton({ className = '', variant = 'dark' }) {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const styles = VARIANTS[variant];

  if (installed) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${styles.installed} ${className}`}>
        ✓ Aplicativo instalado
      </span>
    );
  }

  if (!canInstall) return null; // nunca mostra um botão que não vai funcionar

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${styles.button} ${className}`}
    >
      📱 Instalar aplicativo
    </button>
  );
}
