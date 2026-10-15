# Site público /igreja — novo visual (React + Vite)

- `src/pages/PublicChurch.jsx` — página `/igreja` (mesma API: `getPublicChurch(VITE_CHURCH_SLUG)`).
- `src/site/` — Header, seções, helpers de dados (`siteData.js`).
- `src/pages/PublicSiteSettings.jsx` — painel "Página Pública" ampliado.
- `public/site/` — imagens genéricas do v0 (otimizadas, JPEG).
- Cores do site usam tokens `site-*` no Tailwind, sem afetar o painel.
- Dependência nova: `lucide-react`.

Rodar: `npm install` e `npm run dev`. Veja BACKEND_PATCH.md para ativar imagens/vídeos pelo painel.
