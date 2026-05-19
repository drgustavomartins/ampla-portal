# Ampla IA — Adaptação do Portal

Este documento descreve a adaptação do portal existente (Ampla Facial /
Harmonização Orofacial) para o novo produto **Ampla IA** — formação prática
sobre uso de Inteligência Artificial na rotina de profissionais de saúde:
clínica, atendimento ao paciente, gestão administrativa, comercial/marketing
e estudo/educação, sempre com ética e respeito à LGPD.

A adaptação foi feita em modo **estrutural-preservador**: a área de membros,
auth, banco de dados, plano, comunidade e integrações continuam funcionando
como antes — o que mudou foi a camada de marca, taxonomia de categorias e
textos voltados ao aluno. Conteúdo real de aulas/módulos é gerenciado via
admin no banco e não foi migrado por este PR.

---

## 1. Arquitetura existente (mapeamento)

Stack:

- **Frontend**: React 18 + Vite 7 + Wouter (hash routing) + TanStack Query +
  Tailwind + Radix UI + framer-motion. Entry em `client/index.html` →
  `client/src/main.tsx` → `client/src/App.tsx`.
- **Backend**: Express 5 + Drizzle ORM (Postgres / Neon). Entry em
  `server/index.ts` (dev) e `api/index.mjs` (Vercel serverless). Build
  produz `dist/public/` (estáticos) e `dist/index.cjs` + `api/index.mjs`
  (servidor).
- **Auth**: JWT + cookies + passport-local; rotas /api/auth/login,
  /api/auth/register-trial, /api/auth/forgot-password. Controlado por
  `AuthProvider` em `client/src/lib/auth.tsx`.
- **Database**: `shared/schema.ts` (Drizzle) — `users`, `plans`, `modules`,
  `lessons`, `lesson_progress`, `material_*`, `certificates`, `lead_*`,
  `site_visitors`, etc. Conteúdo é DB-driven; o admin edita módulos e
  aulas via `/` (quando role = admin/super_admin).
- **Roteamento principal** (`client/src/App.tsx`):
  - `/` — student-dashboard ou admin-dashboard conforme role
  - `/module/:id` — módulo + lições
  - `/comunidade`, `/creditos`, `/creditos/regras`, `/materiais`,
    `/encontros-quinzenais`, `/acompanhamento`
  - `/planos`, `/planos-publicos`, `/upgrade`, `/pagamento/sucesso`
  - `/lp`, `/quiz`, `/comecar`
  - `/termos`, `/privacidade`, `/reset-password/:token`
- **Componentes reutilizáveis (Netflix UI)** em
  `client/src/components/netflix/`: `LessonCard`, `LessonRow`,
  `LessonListItem`, `HeroContinue`, `ModuleHero`, `NetflixPlayer`,
  `NextUpOverlay`, `TheaterMode`, `CertificateCard`, `PodcastCard`,
  `HoverPreview`, `RowSkeleton`, `PlaybackSpeedControl`.
- **Identidade visual**: paleta dourada (`#D4A843` gold) sobre fundo
  escuro (`#0A1628`), tipografia serif (Cormorant Garamond / Playfair) +
  General Sans para UI. Definida em `client/src/index.css` e
  `tailwind.config.ts`.
- **Estados de progresso**: tabelas `lesson_progress` (completed boolean) +
  `user_video_progress` (segundos assistidos). Hooks
  `use-video-progress.ts`, `use-supplementary-progress.ts`,
  `use-student-init.ts`.
- **Integrações**: Stripe (checkout + planos), Resend (e-mail), Drive
  (PDFs / áudios via `driveId`), YouTube (vídeos embed via `youtubeId`).

---

## 2. Estratégia de adaptação

Objetivo: o portal continua funcionando para os alunos atuais enquanto
adotamos a marca **Ampla IA** e a nova taxonomia. O design dorsal não
muda (mesmas rotas, mesmo dashboard Netflix-like, mesmo fluxo de plano).

Como o conteúdo de módulos/aulas vive no banco e é editado pelo admin,
não criamos fixtures de aulas novas. A camada de UI passa a:

1. **Anunciar a marca Ampla IA** em todos os pontos visíveis ao aluno
   (login, dashboard, módulo, comunidade, créditos, footer, SEO).
2. **Reagrupar módulos** em 6 eixos do Ampla IA (Clínica, Atendimento,
   Administrativo, Comercial, Educação, Ética/LGPD) por palavra-chave
   no título — substituindo os antigos eixos HOF (Toxina, Preenchedores,
   Bioestimuladores, Moduladores, NaturalUp).
3. **Manter compatibilidade**: módulos antigos continuam exibíveis;
   apenas deixam de cair nas fileiras categorizadas até o admin renomeá-los
   ou criar novos com títulos alinhados às palavras-chave.
4. **Centralizar a marca** em `client/src/lib/brand.ts` para que ajustes
   futuros sejam feitos em um único lugar.
5. **Não tocar em segredos, env vars, Vercel settings, schemas DB,
   integrações Stripe/Resend nem em qualquer fluxo de auth.**

### Nova taxonomia (eixos do Ampla IA)

Definida em `client/src/lib/brand.ts → BRAND_CATEGORIES`:

| Eixo | Emoji | Palavras-chave (no título do módulo) |
|------|-------|--------------------------------------|
| IA na Rotina Clínica | 🩺 | clínic, anamnese, diagnost, prontuário, evolução, exame |
| IA no Atendimento ao Paciente | 💬 | atendimento, paciente, comunicação, whatsapp, chatbot, recepção, agendamento |
| IA na Gestão e Administrativo | 📊 | gestão, administr, financeir, agenda, processo, operação, fluxo |
| IA Comercial e Marketing | 📈 | marketing, vendas, comercial, captação, lead, tráfego, instagram, mídia |
| IA para Estudo e Educação | 📚 | estudo, educa, aprend, artigo, pesquisa, evidência, literatura, resumo |
| Ética, LGPD e Limites da IA | 🛡️ | ética, lgpd, privacid, regula, limit, responsab, segurança |

---

## 3. Arquivos alterados / criados / preservados

### Criados (do zero)

- `client/src/lib/brand.ts` — fonte única de marca, eixos, fallbacks de
  descrição, disclaimer ético sobre IA na saúde.
- `docs/AMPLA_IA.md` — este documento.

### Adaptados (Ampla Facial → Ampla IA)

- `client/index.html` — `<title>`, meta description, keywords, Open Graph,
  Twitter Card, JSON-LD (`EducationalOrganization`), `apple-mobile-web-app-title`.
- `client/src/pages/login.tsx`:
  - logo/cabeçalho do formulário: `AMPLA IA` + tagline
  - lista de módulos vitrine (coluna direita): agora vem de
    `BRAND_SHOWCASE_MODULES`
  - subtítulo do login: "Acesse suas aulas do Ampla IA"
  - banner quiz: pergunta sobre IA na prática
  - depoimento ilustrativo neutro (sem promessa clínica)
  - link "Conheça o Ampla IA"
- `client/src/pages/student-dashboard.tsx`:
  - header e mobile menu: `AMPLA IA` + tagline
  - footer: `BRAND.copyrightLine` + badge "AMPLA IA" (removido `NATURALUP®`)
  - footer: renderiza `BRAND_AI_DISCLAIMER` em letra miúda — única
    superfície persistente do disclaimer ético do produto IA
  - `getCourseDescription` agora delega a `getBrandModuleDescription`
  - fileiras categorizadas no dashboard usam `BRAND_CATEGORIES`
  - cards de "Comunidade NaturalUp" → "Comunidade Ampla IA"
  - `whatsappRenewUrl` agora usa `BRAND.name` (sem Ampla Facial hard-coded)
  - mensagem WhatsApp de upgrade/aquisição referencia `BRAND.name`
- `client/src/pages/module-page.tsx`:
  - `MODULE_THEMES` rekey para os 6 eixos do Ampla IA com paletas
    coerentes; fallback default = `administrativo` (gold)
  - `getModuleTheme` agora roteia por regex de palavra-chave dos eixos
  - WhatsApp e footer referenciam `BRAND.name`
- `client/src/pages/comunidade.tsx` — título "Comunidade Ampla IA" e
  subtítulo focado em prompts/cases de IA.
- `client/src/pages/credits.tsx` — texto de indicação no WhatsApp; footer.
- `client/src/pages/credits-rules.tsx` — footer.
- `client/src/pages/upgrade.tsx` — copy "comece sua formação em IA aplicada
  à saúde com o Ampla IA".
- `client/src/pages/termos.tsx` — `alt` da logo, seção 1
  (Identificação do serviço — agora consistentemente "Ampla IA", operada
  por Dr. Gustavo Martins, domínio histórico mantido durante transição),
  seção 2 (Objeto) e seção 4 (Propriedade intelectual) reescritos para
  o contexto Ampla IA.
- `client/src/pages/privacidade.tsx` — `alt` da logo migrado para
  "Ampla IA" (página linkada do aceite LGPD do cadastro).
- `client/src/pages/reset-password.tsx` — `alt` da logo e h1
  migrados para "Ampla IA" (fluxo de auth).
- `client/src/components/CreditsDashboardCard.tsx` — referral
  WhatsApp do card que o aluno vê no dashboard agora usa `BRAND.name`
  e `BRAND.domain`.
- `client/src/components/CreditsFullSection.tsx` — referral WhatsApp
  da seção completa de créditos também migrado para `BRAND.name`.
- `client/src/pages/admin-dashboard.tsx` — logo no header e footer.
- `client/src/lib/brand.ts` — `BRAND_SHOWCASE_MODULES` agora é
  `readonly` (`as const satisfies ReadonlyArray<...>`).

### Preservados intencionalmente

Os arquivos abaixo não foram alterados para minimizar risco. Eles
continuam com texto HOF e devem receber **conteúdo do Ampla IA** numa
próxima rodada de validação com o Dr. Gustavo:

- `client/src/pages/lp.tsx` — landing page pública. ~1170 linhas de copy
  HOF (depoimentos, Método NaturalUp®, mentoria etc.). Requer pass de
  redação dedicado.
- `client/src/pages/planos-publicos.tsx` e `client/src/pages/planos.tsx`
  — copy comercial dos planos VIP / Observacional / Imersão atrelada à
  marca NaturalUp®.
- `client/src/pages/quiz.tsx` — quiz de perfil HOF: perguntas, pesos e
  recomendações são HOF-específicas.
- `client/src/pages/encontros-quinzenais.tsx` — lista hardcoded de
  encontros gravados de HOF; é conteúdo histórico real do Dr. Gustavo,
  manter como acervo enquanto não houver decisão de remoção.
- `client/src/pages/materiais-complementares.tsx` — biblioteca de
  materiais clínicos por tema (Toxina/Preenchedores/Bioestimuladores);
  segue o esquema de "material_themes" no banco. Sem mudança até
  re-categorização pelo admin.
- `client/src/components/SelectThemeModal.tsx` — escolha de tema para
  o plano "Modulo com Pratica" (lista hardcoded HOF).
- `client/src/components/QuizLeadsTab.tsx`,
  `client/src/components/LeadsTab.tsx`,
  `client/src/components/whatsapp-especialista.tsx` — mensagens default
  para CRM/leads admin referenciam "Ampla Facial". Atualizar quando a
  estratégia comercial do Ampla IA for definida.
- `server/*`, `shared/schema.ts`, `shared/access-rules.ts`, `api/*`,
  `vercel.json`, `drizzle.config.ts`, `vite.config.ts`, `tailwind.config.ts`,
  `package.json`, `.env*` — **não tocados**. Sem mudanças de schema,
  endpoint, build ou infra.

### Removidos

Nenhum arquivo foi deletado. Conteúdo HOF foi preservado para garantir
que dados de alunos atuais continuem renderizando até a migração de
conteúdo do banco.

---

## 4. Verificações executadas

| Verificação | Comando | Resultado |
|---|---|---|
| Dependências | `npm ci` | OK (599 pacotes) |
| Typecheck | `npm run check` (tsc) | **0 erros** |
| Build full | `npm run build` (Vite + esbuild + Vercel handler) | **OK** — `dist/public` + `dist/index.cjs` + `api/index.mjs` |
| Testes regras de acesso | `npx tsx shared/access-rules.test.ts` | **72 passed, 0 failed** |

Não há suite de testes E2E nem framework de unit tests JS configurado
no projeto além do `access-rules.test.ts`. UI não foi validada em
browser por esta etapa ser feita em ambiente headless.

---

## 4.1 Follow-up da revisão sênior (PR #96)

A revisão de produto/UX apontou bloqueadores e inconsistências dentro
da própria área de membros. As correções abaixo foram aplicadas em
cima do commit inicial:

- **B1 — Footer com `NATURALUP®`**: substituído por `AMPLA IA` em
  `student-dashboard.tsx`. Agora idêntico a `credits.tsx`,
  `credits-rules.tsx` e `module-page.tsx`.
- **B2 — Incoerência legal nos Termos**: seção 1 reescrita para
  identificar consistentemente o serviço como "Ampla IA", operado por
  Dr. Gustavo Medeiros Martins, com nota explícita de que o domínio
  histórico (`portal.amplafacial.com.br`) foi mantido durante a
  transição de marca. Documento legal não mistura mais duas marcas.
- **B3 — Referral copy HOF nos cards**: `CreditsDashboardCard.tsx` e
  `CreditsFullSection.tsx` agora geram o texto WhatsApp via `BRAND.name`
  e `BRAND.domain`, alinhados à página `credits.tsx`.
- **B4 — `alt="Ampla Facial"` em `termos.tsx`**: corrigido para "Ampla IA".
- **O1 — `privacidade.tsx` e `reset-password.tsx`**: `alt` da logo e h1
  ("Ampla Facial" → "Ampla IA"). Páginas alcançáveis a partir do
  cadastro (LGPD) e do fluxo de recuperação de senha.
- **O2 — `BRAND_AI_DISCLAIMER` invisível**: agora é renderizado em
  letra miúda no rodapé do dashboard do aluno, abaixo do copyright.
  É a primeira superfície persistente do disclaimer ético do produto IA
  e materializa a promessa "IA com responsabilidade, sem substituir
  julgamento clínico".
- **Refinos opcionais**: `BRAND_SHOWCASE_MODULES` virou `readonly`
  (`as const satisfies ReadonlyArray<...>`) e o fallback do
  `MODULE_THEMES` foi extraído numa constante `DEFAULT_MODULE_THEME`
  para deixar a intenção explícita.

### O que NÃO foi alterado (decisões deliberadas)

- **O3** (módulos HOF no dashboard, vitrine vende eixos que não
  existem no banco, quiz ainda HOF) — exige migração de conteúdo pelo
  admin / pass dedicado de copywriting; documentado em "Riscos" e
  "Próximos passos". Mantido proposital até decisão comercial.
- **O4** (covers PNG com nomes HOF) — depende de fornecimento de
  artes. Naming sugerido permanece em "Próximos passos".
- **O5** (7 itens na vitrine vs 6 eixos) — manter `Boas-vindas` como
  item de hospitalidade é coerente com a tese do produto; aguarda
  decisão se será materializado como módulo dedicado no banco.
- **D1-D5** — pontos de discussão (domínio, posicionamento do
  founder, descrição dos cards de comunidade, og-image, design
  system) — todos exigem decisão do Dr. Gustavo / aprovação visual
  antes de qualquer code change.

---

## 5. Recomendações de UX / próximos passos

1. **Rodada de conteúdo do Dr. Gustavo** para reescrever LP
   (`lp.tsx`), planos (`planos-publicos.tsx`, `planos.tsx`) e o quiz
   (`quiz.tsx`) com a oferta do Ampla IA. São três pontos
   public-facing que ainda promovem HOF.
2. **Migração de módulos no banco**: criar (via admin) ao menos um
   módulo por eixo do Ampla IA com nomes que casem com as
   `BRAND_CATEGORIES[].keywords` para que o dashboard mostre fileiras
   completas. Sugestão de seeds iniciais:
   - "IA na Rotina Clínica — Fundamentos"
   - "IA no Atendimento — Comunicação com pacientes"
   - "IA na Gestão da Clínica"
   - "IA Comercial — Marketing ético em saúde"
   - "IA para Estudo — Lendo artigos com IA"
   - "Ética, LGPD e Limites da IA na Saúde"
3. **Capas (covers) por eixo** em `client/public/images/covers/`. As
   resoluções esperadas (~1280×720 PNG) são as mesmas das capas HOF.
   Esquema de naming sugerido:
   `cover_ia_<eixo>_v2026.png` (clinica, atendimento, administrativo,
   comercial, educacao, etica).
4. **Reagrupar materiais (`material_themes`)** alinhados aos eixos do
   Ampla IA — hoje o controle é por categoria string. Pode ser feito
   100% via admin sem code change.
5. **Disclaimer de IA**: já inserido no rodapé do `student-dashboard`
   em letra miúda usando `BRAND_AI_DISCLAIMER`. Avaliar se vale
   replicar abaixo de aulas clínicas específicas ou no
   `module-page`. Mantido enxuto para não poluir o layout.
6. **Stripe / planos**: revisitar os nomes de planos
   (`shared/schema.ts → PLAN_KEYS`) — hoje têm semântica HOF
   (`vip_presencial`, `observador_*`, `imersao_elite`). Renomear
   exigiria orquestração com o Stripe (produtos lá precisam refletir).
   Recomenda-se manter como está até decisão comercial e fazer a
   migração em um PR separado, com plano de rollout claro.
7. **OG image** (`/og-image.png`) ainda exibe Ampla Facial. Substituir
   no upload assim que houver arte do Ampla IA.
8. **Comunidade**: o card no dashboard agora é "Comunidade Ampla IA",
   mas a página em si (`comunidade.tsx`) tem conteúdo dinâmico do
   banco. Quando os primeiros posts/temas de IA forem criados, vale
   um pass para garantir que mensagens default não promovam HOF.

---

## 6. Riscos / pendências de validação

- **Renderização HOF persistente**: enquanto módulos atuais
  ("Toxina Botulínica", "Preenchedores Faciais", ...) existirem no
  banco, eles continuarão sendo listados — sem cair nas fileiras dos
  novos eixos. **Não bloqueia o uso**, mas dá a impressão de "produto
  duplo" enquanto a migração de conteúdo não ocorre. Mitigação: ocultar
  módulos antigos via toggle de visibilidade no admin, ou recategorizar
  por título.
- **Domínio / Vercel / SEO**: o domínio (`portal.amplafacial.com.br`)
  foi mantido conforme orientação. O canonical e og:url continuam
  apontando para ele. Se houver troca futura de domínio, é necessário
  ajuste em `client/index.html` + `BRAND.domain` + Vercel.
- **LP / planos comerciais ainda HOF**: usuários que chegarem em
  `/lp`, `/planos-publicos`, `/planos`, `/quiz` verão a oferta antiga.
  É proposital nesta rodada — a redação comercial deve ser feita pelo
  Dr. Gustavo. Não há risco técnico, apenas inconsistência narrativa.
- **Sem deploy**: nenhum push para `main` ou trigger de Vercel foi
  feito. O PR fica pronto para revisão humana antes de qualquer
  publicação.
- **Conteúdo médico sensível**: nenhum conteúdo clínico novo foi
  redigido. Toda copy adicionada é genérica e ressalta o caráter de
  apoio da IA (ver `BRAND_AI_DISCLAIMER`).
- **Credenciais / env**: nenhum arquivo `.env*`, `.mcp.json` ou
  configuração de secret foi alterado.

---

## 7. Decisões de arquitetura

- **Centralização via `brand.ts` em vez de i18n**: como o portal é
  monoidioma (pt-BR) e a marca anterior estava espalhada em ~20
  arquivos, optei por um módulo TS único com constantes e helpers, em
  vez de adicionar uma camada de i18n. Mais simples, sem nova
  dependência, e revisar/alterar marca passa a ser uma edição
  pontual.
- **Re-key de `MODULE_THEMES`**: mantive a estrutura do objeto e a API
  do `getModuleTheme(title)` para não exigir refactor nos consumidores.
  Apenas as chaves e o critério de match mudaram.
- **Heurística por palavra-chave**: o dashboard agrupa módulos por
  termos no título (mesmo padrão usado anteriormente para HOF). Isso
  cobre a migração gradual: o admin pode renomear módulos no banco e
  o agrupamento se atualiza sem deploy.
- **Sem mexer em LP/planos/quiz**: são páginas de conversão com
  copywriting denso e dependem de validação humana / brand voice. Um
  PR de redação dedicado é mais seguro do que tentar adivinhar a
  oferta correta do Ampla IA.

---

## 8. Aprovação necessária para...

| Ação | Aprovação necessária? |
|---|---|
| Mergear esta branch em `main` | Sim — revisão do Dr. Gustavo |
| Deploy em produção (Vercel) | Sim |
| Substituir capas e og-image | Sim — fornecer artes |
| Reescrever LP/planos/quiz | Sim — copywriting do Dr. Gustavo |
| Migrar nomes de planos Stripe | Sim — coordenação Stripe + comercial |
| Criar módulos novos no admin | Não — pode ser feito direto na UI quando branch for publicada |
