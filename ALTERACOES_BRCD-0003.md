# Relatório de alterações — BRCD-0003

Base: ZIP `igreja-adonai-GITHUB.zip` (preservado, não modificado). Trabalho feito em cópia.

## Arquitetura, módulos, permissões, APIs e banco
**Não alterados**: schema Prisma (apenas 3 comentários), `database/`, `prisma/*.sql`, rotas, controllers, autenticação (JWT/refresh/RBAC), permissões, módulos. Nenhum comando foi executado contra qualquer banco.

## Alterado
**Marca/identidade** — login com a logo "O justo viverá pela Fé" + "Sistema de Gestão e Site BrCode >_" e rodapé (BrCode + BRCD-0003); rodapé do app com BRCD-0003 (era BRCD-0002); `brand.js`; paleta preto/branco/cinza (Tailwind e gráficos); favicon/PWA com cruz; manifest e meta tags; título; tela de validação de carteirinha.
**Desvínculo da Adonai** — URL de produção e `.env` removidos; `api.js` usa `VITE_API_URL` (ou `/api`); slug fixo substituído por `VITE_CHURCH_SLUG`; chaves de localStorage neutras; host ngrok removido; nomes dos pacotes; `README`s e comentários.
**Site público** — nome da igreja vem da configuração; textos inventados (história, missão, visão, apresentação, mensagem do topo) removidos → seções ocultas quando vazias.
**PDFs e carteirinha** — nome da igreja vem do banco (relatórios de membros, obreiros, financeiro, ficha, escala, rodapé); carteirinha sem brasão/nome fixos, com cruz e nome cadastrado.
**Seed** — igreja por `SEED_CHURCH_NAME/SLUG`; dados de demonstração só com `SEED_DEMO=true` (bloqueado em produção) e senha via `SEED_DEMO_PASSWORD` (sem `demo1234`); e-mails demo em `@demo.example`; primeiro admin continua interativo.
**Configuração** — `backend/.env.example` (novo) e `frontend/.env.example` (novo).

## Removido do pacote
`.git` (histórico), `frontend/.env`, `frontend/dist`, `node_modules`, `brand-assets/` (originais IEMA), `iema-*`, `a.png`, `a.jpg`, `event-conference.jpg` (foto com brasão e lema da Adonai), `public/manifest.json` (duplicado com nome da Adonai), emblemas da Adonai do backend.

## Referências à Adonai mantidas
Nenhuma. Varredura por `adonai|iema|onrender|ngrok` no código, docs e no `dist` gerado: 0 ocorrências.

## Testes executados
- `vite build` do frontend: **OK** (PWA gerado, 18 entradas de precache); manifest conferido.
- `node --check` em todos os `.js/.mjs` do backend: **OK**.
- `npm run test:availability`: **10/10 passaram**.
- Backend sem variáveis: encerra com "Variável de ambiente obrigatória ausente" (não depende de credenciais da Adonai).
- PDF de carteirinha gerado com dados fictícios e inspecionado visualmente: **OK**.
- Login renderizado em desktop e celular e inspecionado: **OK**.

## Não verificado / limitações
- **Prisma** (`generate/validate`) não rodou: o sandbox não baixa o engine (`binaries.prisma.sh`). Schema e SQL estão funcionalmente idênticos ao original. Rode `npx prisma generate` na sua máquina.
- **Não testados** (exigem banco novo): seed, login, criação do primeiro admin, CRUDs, relatórios PDF reais, site público com dados, endpoints e permissões.
- **`npm ci` falha também no ZIP original** (lockfile fora de sincronia: `react`, `lucide-react`). Use `npm install`; ele só completou o lock, sem atualizar versões.
- `engines.node` exige 20.19.6 exato (original); testei em Node 22.
- Nome da igreja no menu/login depende de site público ativado (veja README).
- Relatórios financeiros em PDF usam o nome da igreja do banco; gráficos PDF agora em cinza.
- As telas internas não foram revisadas uma a uma visualmente; a paleta foi trocada nos tokens centrais. Pode haver detalhes de contraste a ajustar.
- Gota vermelha mantida nos logos conforme enviado (fora da paleta P&B).
- Multi-tenant: o schema suporta, mas esta entrega segue "1 igreja = 1 banco".
