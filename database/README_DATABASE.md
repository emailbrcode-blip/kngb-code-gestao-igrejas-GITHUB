# Banco de dados

## Instalação nesta base existente

Se `phase2_additive.sql` ainda não foi executado nesta base, execute-o primeiro no SQL Editor do Supabase. Depois execute `phase3_modules_additive.sql`. Confirme que o painel está conectado ao projeto correto antes de rodar qualquer SQL. Os scripts são aditivos e usam `IF NOT EXISTS`/`ON CONFLICT` para poderem ser repetidos; não removem dados nem apagam tabelas.

### O que o script acrescenta

- Campos opcionais de conteúdo público na tabela `churches`.
- `events.is_public`, inicialmente falso para eventos existentes.
- Tabela `donation_items` vinculada à igreja e a campanhas já existentes.
- `donations.item_id`, opcional e com `ON DELETE SET NULL`.
- Permissões novas `donations.participate` e `public_site.manage`, apenas se ainda não existirem.
- Permissões de doação para a role `secretaria`, participação para `membro`/`obreiro` e gestão de site público para `admin_geral`.

As relações existentes, IDs, slugs, dados e tabelas não são removidos nem recriados. Nenhuma permissão `finance.*` é associada à Secretaria. O script pressupõe roles com slugs `secretaria`, `membro`, `obreiro` e `admin_geral`, conforme o seed do projeto.

### Fase 3

`phase3_modules_additive.sql` acrescenta os campos e tabelas novos para campanhas em dinheiro/bens/serviços, histórico de status, despesas internas e repasse manual explícito ao Financeiro, lembretes, conteúdo institucional, módulos de ministérios/mídia/visitantes/pedidos de oração/grupos/boletins e indisponibilidade de obreiro em uma data específica. Não executa SQL automaticamente durante a inicialização da API.

As permissões novas são inseridas somente se o slug ainda não existir e os vínculos `role_permissions` usam `ON CONFLICT DO NOTHING`. A Secretaria recebe permissões de gestão da própria área de doações e visitantes; o script não atribui `finance.*` nem `donations.finance_post` à Secretaria. O repasse ao financeiro exige as permissões de repasse e `finance.create` no endpoint.

Após executar ambos os SQL scripts, gere o Prisma Client:

```bash
npm run prisma:generate
```

## Configuração Supabase

Use a conexão PostgreSQL do Supabase em `DATABASE_URL`. Se a URL tiver `?` e `&` fornecidos pelo painel, preserve os parâmetros de SSL e codifique caracteres especiais da senha como URL encoding. Não coloque senhas no ZIP.

Após o SQL, a partir da raiz do projeto:

```bash
npm run prisma:generate --workspace backend
```

Não rode `prisma migrate reset` nem `prisma db push` sobre o banco existente sem uma auditoria posterior do diff. O ambiente entregue não inclui cópia de dados ou credenciais do Supabase.
