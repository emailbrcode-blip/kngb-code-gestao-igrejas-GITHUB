# Novo site público — o que o backend precisa para ativar 100% do administrador

Este ZIP contém **somente o frontend** (o backend não foi enviado), então nenhuma
alteração de backend/banco foi feita. Tudo que já existia continua funcionando:
`/igreja` consome `GET /public/church/<slug-da-igreja>` e a tela "Página Pública"
continua salvando os campos `public*` pelo `PATCH /public/church`.

Para controlar **imagens, vídeos, ministérios, logo, botões/links e textos do topo**
pelo painel, o frontend guarda esses itens num único JSON chamado `publicExtras`.
Enquanto o backend não aceitar esse campo, o painel avisa que só os campos antigos
foram salvos e o site mostra o conteúdo genérico inicial.

## 1. Prisma (schema.prisma) — model Church
```prisma
publicExtras Json?
```
Depois: `npx prisma migrate dev --name add_public_extras`

## 2. Salvar (PATCH /public/church)
Aceitar `extras` (objeto) no corpo — o frontend o envia sozinho, numa 2ª chamada
`{ "extras": { ... } }`. No schema de validação (zod/joi), adicione:
`extras: z.record(z.any()).optional()` e no service grave `publicExtras: extras`
apenas quando `extras !== undefined`.
Limite sugerido: rejeitar JSON > 100 KB. Se o `express.json()` estiver com limite
padrão (100 KB) já basta, pois só links são guardados (não imagens em base64).

## 3. Ler
Incluir `publicExtras` no `select`/retorno de:
- `GET /public/church/:slug` (objeto `church`)
- `GET /public/settings`
- resposta do `PATCH /public/church`

## 4. (Opcional) Avisos públicos
A seção "Avisos" do site só aparece se `GET /public/church/:slug` devolver também
`announcements: [{ id, title, content|summary, publishedAt }]` (apenas avisos
publicados e marcados como públicos). Sem isso a seção fica oculta.

## Formato de `publicExtras`
siteName, logoUrl, heroTitle, heroMessage, heroImage, heroButtonLabel, heroButtonUrl,
verseText, verseReference, churchImage, commitment, donationsIntro, mapEmbedUrl,
worshipImages: string[], videos: {title,url,preacher,date}[],
ministries: {name,description,leader,imageUrl}[], links: {label,url}[]
