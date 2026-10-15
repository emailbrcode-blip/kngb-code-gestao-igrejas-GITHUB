# Sistema de Gestão e Site BrCode >_
**"O justo viverá pela Fé!"** — Desenvolvedor: BR Code · Projeto **BRCD-0003**

Plataforma-base para igrejas: gestão (membros, obreiros, escalas, cultos, eventos, avisos, financeiro, doações, carteirinhas, relatórios em PDF), site público institucional com CMS e PWA instalável.

Stack: React + Vite + Tailwind (PWA) · Node.js + Express · Prisma · PostgreSQL (Supabase ou outro).

> **Regra de ouro:** cada igreja cliente tem o seu próprio banco de dados, seus próprios segredos (JWT) e sua própria implantação. Este pacote **não contém** credenciais, banco, dados nem usuários de nenhuma igreja.

## Instalação para uma nova igreja

Pré-requisitos: Node.js 20.x, npm, um PostgreSQL **novo e vazio**.

1. **Banco novo** (Supabase: *New project*; ou PostgreSQL próprio). Copie a connection string. Com pooler do Supabase use a porta `6543` e `?pgbouncer=true`.
2. **Backend** — na pasta `backend`:
   ```powershell
   copy .env.example .env
   ```
   Edite `backend/.env`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (valores aleatórios longos, diferentes por igreja), `FRONTEND_URL`, `PUBLIC_APP_URL`, `BACKEND_URL`, `SEED_CHURCH_NAME` e `SEED_CHURCH_SLUG`.
3. **Dependências** — na raiz do projeto: `npm install`
4. **Estrutura do banco** — aplique o schema ao **banco novo** (somente o novo!). Duas formas, escolha uma:
   - `cd backend` → `npx prisma generate` e `npx prisma db push` (cria as tabelas do `schema.prisma` no banco apontado por `DATABASE_URL`), **ou**
   - rode `backend/prisma/supabase-schema.sql` no SQL Editor do Supabase e, em seguida, os `.sql` de `database/` e `backend/prisma/*.sql` na ordem de data.
   Confira antes que `DATABASE_URL` aponta para o banco **da igreja nova**.
5. **Seed inicial** — `cd backend` → `npm run seed`. Cria a igreja (nome/slug do `.env`), permissões, cargos, funções e categorias padrão, e pergunta no terminal o **nome, e-mail e senha do primeiro Administrador Geral** (mínimo 8 caracteres). Não existe administrador nem senha padrão.
6. **Frontend** — na pasta `frontend`: `copy .env.example .env` e defina `VITE_API_URL` (URL pública da API; vazio em desenvolvimento) e `VITE_CHURCH_SLUG` (**o mesmo** `SEED_CHURCH_SLUG`).
7. **Rodar**: na raiz, `npm run dev:backend` e, em outro terminal, `npm run dev:frontend` → http://localhost:5173
8. **Produção**: `npm run build` (gera `frontend/dist`) e `npm run start:backend`. Render (API) + site estático para o `dist`. `FRONTEND_URL` deve conter o domínio final do frontend (CORS).

## Primeira configuração da igreja (pelo painel)
1. Entre com o administrador criado no seed.
2. **Página Pública**: ative o site público e preencha nome, descrição, endereço, telefone/WhatsApp, e-mail, redes sociais, horários, missão/visão/valores, Pix, logo, imagens, vídeos, ministérios e links. O que ficar vazio **não aparece** no site (nenhum texto institucional é inventado).
3. O nome da igreja aparece no menu lateral, login (abaixo do nome do produto), carteirinhas e PDFs a partir do cadastro da igreja. No menu/login ele é lido do endpoint público `/public/church/:slug`, então precisa de **site público ativado** e `VITE_CHURCH_SLUG` correto; sem isso a interface mostra apenas a marca BrCode >_.
4. Cadastre usuários, cargos, funções, ministérios e membros.

## Dados de demonstração (opcional, só em teste)
`SEED_DEMO=true` e `SEED_DEMO_PASSWORD=<senha de teste>` no `backend/.env` antes do `npm run seed`. É **bloqueado** com `NODE_ENV=production`. Não use em clientes reais.

## Identidade
- A marca **BrCode >_**, o slogan e o rodapé com o identificador **BRCD-0003** são permanentes (`frontend/src/config/brand.js`). O identificador é um número interno de portfólio da BR Code, não um certificado digital.
- A identidade da igreja (nome, logo, textos) é configurada por instalação e não altera a marca do software.
- Paleta: preto, branco e cinza (`frontend/tailwind.config.js`). Verde/vermelho só indicam estados.
- Logos da frase em `frontend/public/brand/` (`frase-fe.png`, `frase-fe-claro.png` para fundos escuros, `frase-fe-3d.png`). Ícone PWA/favicon: cruz.
