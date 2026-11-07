// Marca PERMANENTE do software (não é a identidade da igreja cliente).
// A identidade da igreja (nome, logo, textos…) vem do cadastro/CMS de cada instalação.
export const BRAND = {
   product: 'Sistema de gestão de igrejas — CAMERJ — Sua igreja conectada. Sua gestão simplificada.',
  short: 'Sistema de gestão de igrejas Conveniadas —  CAMERJ.',
  slogan: 'O justo viverá pela Fé!',
  developer: 'KNGB Code',
  // Identificador interno de portfólio da BR Code (terceiro sistema).
  // Não é certificado digital nem certificação de terceiros.
  projectId: 'KNGB-0003',
};

// Slug da igreja desta instalação (o mesmo cadastrado na tabela churches).
// Definido em VITE_CHURCH_SLUG — veja frontend/.env.example.
export const CHURCH_SLUG = (import.meta.env.VITE_CHURCH_SLUG || '').trim();

// Chaves de armazenamento local (neutras, sem nome de igreja).
export const STORAGE_PREFIX = 'KNGB-igrejas';
