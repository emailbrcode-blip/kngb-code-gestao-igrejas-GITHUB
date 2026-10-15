import { BRAND } from '../../config/brand';

// Rodapé global do sistema (assinatura permanente da marca BrCode).
// Renderizado UMA vez no AppLayout e também na tela de login — não repetir nas páginas.
// O identificador (BRCD-xxxx) é o número do projeto no portfólio da BR Code;
// não é certificado digital nem certificação de terceiros.
export function AppFooter({ className = 'mt-10 border-t border-ink/10 pt-4 pb-1' }) {
  return (
    <footer className={className} aria-label="Assinatura do desenvolvedor">
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] leading-none text-ink/45 md:justify-end">
        <span>Desenvolvido por</span>
        <img src="/brcode-logo.png" alt={BRAND.developer} width="68" height="17" className="h-[17px] w-auto" />
        <span aria-hidden="true">·</span>
        <span className="font-medium tracking-wide" title="Identificador interno de portfólio da BR Code (não é certificado digital)">{BRAND.projectId}</span>
      </p>
    </footer>
  );
}
