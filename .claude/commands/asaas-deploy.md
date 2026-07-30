---
description: Fecha e faz deploy da integração Asaas (código + config + cutover) com teste de pagamento real antes do merge na main.
---

# /asaas-deploy — Fechamento da migração Stripe → Asaas

Você vai concluir e colocar no ar a integração de pagamentos Asaas que já está
construída e testada na branch `asaas-integration`. Trabalhe de forma autônoma,
mas respeite os CHECKPOINTS e as REGRAS INVIOLÁVEIS no fim deste arquivo.

Contexto do que já existe na branch `asaas-integration`:
- `server/asaas.ts` — cliente da API + matemática de parcelamento (juros 13–21x
  numa constante única `MONTHLY_INTEREST_RATE`).
- `server/fulfill-purchase.ts` — `fulfillPurchase()`, agnóstico de provedor,
  idempotente por `paymentRef`. JÁ testado ponta a ponta contra o banco real.
- `server/asaas-routes.ts` — `POST /api/asaas/create-checkout` e
  `POST /api/asaas/webhook` (casca fina que chama `fulfillPurchase`).
- O webhook do Stripe em `server/stripe-routes.ts` ainda NÃO usa `fulfillPurchase`
  (mantém as ~150 linhas inline). Isso é o primeiro passo abaixo.

Não invente lógica de negócio nova. Não altere valores de plano. Preserve o
Stripe 100% funcional durante toda a transição.

---

## Pré-condições (verifique; se algo faltar, PARE e peça ao Gustavo)

Confirme que existem, no ambiente, estas variáveis (não as imprima no log):
- `DATABASE_URL` — Neon de produção
- `ASAAS_API_KEY` — chave de produção do Asaas (começa com `$aact_prod_`)
- `VERCEL_TOKEN` — token da Vercel
- `GITHUB_TOKEN` ou remote já autenticado para `git push`

Confirme o estado do repo:
- `git fetch` e que a branch `asaas-integration` existe e está à frente da `main`.
- `git status` limpo. Se houver mudança não commitada, mostre e pergunte antes.

Se qualquer pré-condição falhar, pare aqui e reporte exatamente o que falta.

---

## Fase 1 — Integrar o Stripe ao `fulfillPurchase` (código)

Objetivo: o webhook do Stripe passar a chamar `fulfillPurchase()` em vez das
~150 linhas inline, para que Stripe e Asaas compartilhem o MESMO caminho (e a
correção de idempotência do contrato beneficie os dois).

1. Em `server/stripe-routes.ts`, no handler `checkout.session.completed`, ramo
   `session.payment_status === "paid"`: substitua todo o bloco inline (update do
   usuário, módulos, materiais, débito de crédito, audit log, cashback, referral,
   contrato) por uma única chamada:
   ```ts
   await fulfillPurchase({
     userId,
     planKey,
     amountPaidCents: session.amount_total ?? PLANS[planKey].price,
     isUpgrade,
     creditsUsedCents: Number(session.metadata?.creditsUsed || 0),
     referralCode: session.metadata?.referralCode || null,
     paymentRef: session.id,
     paymentIntentRef: String(session.payment_intent ?? session.id),
     providerLabel: "Sistema Stripe",
   });
   ```
   Importe `fulfillPurchase` de `./fulfill-purchase`. NÃO toque nos ramos de
   `isTrialSetup`, `payment_intent.payment_failed` nem `invoice.payment_failed` —
   esses continuam como estão.

2. Rode `npx tsc --noEmit` e garanta que os arquivos tocados (stripe-routes,
   fulfill-purchase, asaas*) ficam sem novos erros. Erros pré-existentes em
   `shared/schema.ts` e avisos `TS5101` podem ser ignorados.

3. **CHECKPOINT — teste de fulfillment repetível.** Rode um teste que:
   - captura o snapshot completo de um usuário de teste (padrão: ID 83) —
     users + user_modules + user_material_categories + contracts + credit_transactions;
   - chama `fulfillPurchase` 3× com o MESMO `paymentRef` (ref começando com `TEST_`)
     para um plano diferente do atual;
   - verifica: exatamente 1 contrato e no máximo 1 cashback para aquele ref
     (idempotência);
   - restaura o usuário ao snapshot e apaga todo registro `TEST_%`.
   Se o teste não fechar (mais de 1 contrato, estado não restaurado), PARE e
   reporte — não prossiga para deploy.

4. Commit na branch: `fix(stripe): webhook usa fulfillPurchase compartilhado`.
   Não faça merge ainda.

---

## Fase 2 — Configuração de ambiente (Vercel + Asaas)

1. Gere um `ASAAS_WEBHOOK_TOKEN` aleatório forte (ex.: 32 bytes hex). Guarde-o
   para usar nos dois lugares abaixo. NÃO o escreva em nenhum arquivo do repo.

2. Via API da Vercel (projeto `prj_KnxdyiKs1Ji8McKBgGu2F6yS40h0`, team
   `team_QnySGDCkFeTGFdPSGDEEzyBc`), defina como env vars de Production:
   - `ASAAS_API_KEY` = (a chave de produção)
   - `ASAAS_WEBHOOK_TOKEN` = (o token gerado)
   - `ASAAS_ENV` = `production`
   - `PUBLIC_BASE_URL` = `https://portal.amplafacial.com.br`
   Se alguma já existir, atualize em vez de duplicar.

3. Registre o webhook no Asaas via API (`POST /v3/webhooks`):
   - `url` = `https://portal.amplafacial.com.br/api/asaas/webhook`
   - `email` = e-mail de alertas do Gustavo
   - `enabled` = true, `interrupted` = false
   - `authToken` = o mesmo `ASAAS_WEBHOOK_TOKEN`
   - `sendType` = `SEQUENTIALLY`
   - eventos: no mínimo `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`
   Confirme lendo `GET /v3/webhooks` que ficou ativo e sem erro.

---

## Fase 3 — Cutover do frontend

1. Em `client/src/pages/planos.tsx` (e onde mais o checkout for disparado),
   troque a chamada de `/api/stripe/create-checkout` para
   `/api/asaas/create-checkout`. O corpo (planKey, isUpgrade, creditsToUse,
   referralCode) é o mesmo; a resposta traz `url` — redirecione para ela.
2. Rode o build do client (`npm run build` ou o script do projeto) e garanta
   que passa.
3. Commit: `feat(checkout): frontend aponta para o checkout Asaas`.

---

## Fase 4 — Deploy de PREVIEW + teste de cobrança REAL

1. `git push` da branch. A Vercel gera um deploy de preview. Faça poll em
   `/v6/deployments` filtrando pelo SHA do topo da branch até `state=READY`
   (3–4 min). Pegue a URL do preview.

2. **CHECKPOINT — cobrança real de baixo valor.** No deploy de preview:
   - crie um checkout real do menor ticket possível (ou um item de R$5 via
     `/api/asaas/create-checkout` autenticado como o usuário de teste);
   - pague de verdade (Pix é o mais rápido);
   - confirme que o webhook chegou e `fulfillPurchase` provisionou (cheque o
     banco: plano/módulos/contrato do usuário de teste);
   - **reverta**: estorne/cancele a cobrança no Asaas e restaure o usuário de
     teste ao estado original.
   Se o webhook não chegar ou o provisionamento falhar, PARE. Não merge.

---

## Fase 5 — Merge na main (só depois do CHECKPOINT da Fase 4 passar)

1. Só prossiga se a cobrança real de teste provisionou e foi revertida com sucesso.
2. Faça merge de `asaas-integration` em `main` (sem squash, preservando o
   histórico dos commits) e `git push`.
3. Aguarde o deploy de produção ficar `READY` (poll por SHA).
4. Smoke test em produção: `GET` de sanidade no portal, e criar (sem pagar) um
   checkout Asaas para confirmar que a env `ASAAS_API_KEY` de produção responde.

---

## Pós-deploy (reporte, não execute sem confirmar)

Liste para o Gustavo, como pendências finais:
- **Rotacionar a chave Asaas de produção** (ela foi exposta em chat) e atualizar
  a env var na Vercel.
- Definir se os juros 13–21x ficam em 1,99% a.m. (padrão) ou 0,86% (neutro) —
  é trocar `MONTHLY_INTEREST_RATE` em `server/asaas.ts`.
- Anunciar o parcelamento no site institucional só DEPOIS deste deploy no ar.

---

## REGRAS INVIOLÁVEIS

- NUNCA faça merge na `main` antes do CHECKPOINT da Fase 4 (cobrança real) passar.
- NUNCA escreva segredos (chaves, tokens, connection strings) em arquivos do repo,
  em commits, ou no log. Use apenas variáveis de ambiente e a API da Vercel.
- NUNCA altere preço de plano, `MONTHLY_INTEREST_RATE`, nem lógica de negócio aqui.
  Este comando é deploy, não redesenho.
- Toda alteração no usuário de teste DEVE ser revertida ao snapshot no fim.
- Se qualquer teste ou build falhar, PARE no ponto e reporte — não "conserte
  seguindo em frente".
- Mantenha o Stripe funcional o tempo todo. Nada de remover as rotas do Stripe.
