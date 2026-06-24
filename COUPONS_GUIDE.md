# 🎁 Sistema de Cupons de Desconto — Guia de Uso

## Visão Geral

Sistema de cupons com **escassez e urgência** (48h, desconto flexível). Perfeito para:
- Negociações com alunos em dúvida
- Conversão de leads
- Black Friday/promoções especiais
- Ofertas personalizadas ("48 horas só pra você")

---

## ✨ Características

✅ **Códigos únicos** — Gerados automaticamente (NATURAL48-XXXXX)  
✅ **Desconto flexível** — Define quantos % ao criar  
✅ **Duração flexível** — Define quantas horas (padrão 48h)  
✅ **Histórico completo** — Vê quem usou, quando, qual plano  
✅ **Controle total** — Ativar, desativar, revogar cupons  
✅ **Links diretos** — Compartilha via WhatsApp/Email  

---

## 🚀 Como Usar

### 1️⃣ Acessar o Dashboard de Cupons

**Link:** `https://portal.amplafacial.com.br` → Admin Dashboard → Aba "Cupons"

**Quem pode acessar:** Amanda (admin) e Gustavo (super_admin)

---

### 2️⃣ Criar Novo Cupom

Clique em **[+ Novo Cupom]**

**Preencher:**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Desconto (%)** | Percentual de desconto | `10` |
| **Válido por (horas)** | Quantas horas até expirar | `48` |
| **Tipo de Plano** | Qual(is) plano(s) aceita | "Todos os planos" |
| **Observação (opt.)** | Nota interna | "Aluno João Silva - negociação" |

**Clique:** [Gerar Cupom]

---

### 3️⃣ Copiar e Compartilhar

Após gerar, você verá o cupom listado:

**Opções:**

- **📋 Copiar Código** — Copia apenas o código (NATURAL48-XK7M9P)  
  → Usa em cupom no checkout

- **👁️ Copiar Link** — Copia URL completa com cupom pré-aplicado  
  → Compartilha via WhatsApp/Email  
  → Link: `https://portal.amplafacial.com.br/checkout?coupon=NATURAL48-XK7M9P`

- **🔴 Revogar** — Desativa cupom se não for mais usado

---

### 4️⃣ Ver Histórico de Uso

Clique em **↓ Ver uso** abaixo do cupom para expandir:

- **Quem usou** — Nome e email do aluno
- **Quando usou** — Data/hora exata
- **Qual plano** — Mentoria, Imersão, Horas, etc.
- **Total de usos** — Cupom pode ser usado ilimitadamente

---

## 💬 Exemplos de Uso

### Exemplo 1: Negociação Rápida via WhatsApp

```
Amanda cria cupom:
- Desconto: 10%
- Válido: 48 horas
- Plano: Todos

Copia o link:
https://portal.amplafacial.com.br/checkout?coupon=NATURAL48-XK7M9P

Envia para o aluno via WhatsApp:
"Oi! Consegui uma oferta especial só pra você — 10% de desconto 
em qualquer plano. Mas é válido por apenas 48 horas.

Link: [copia do checkout]

Quer conversar antes?"
```

---

### Exemplo 2: Black Friday Personalizada

```
Gustavo criar 10 cupons:
- Desconto: 25%
- Válido: 72 horas (3 dias)
- Tipo: Todos os planos

Salva os links em um documento e distribui para:
- Top leads (contato direto)
- Email marketing
- Instagram Stories
```

---

## ⚙️ Detalhes Técnicos

### Geração Automática de Código

**Formato:** `NATURAL48-XXXXXX`

- `NATURAL48` — Prefixo fixo (indica urgência 48h)
- `XXXXXX` — 6 caracteres aleatórios (A-Z, 0-9)

**Exemplo:** NATURAL48-XK7M9P, NATURAL48-AB12CD

### Validação no Checkout

Quando o aluno insere o cupom:

✅ Verifica se existe  
✅ Verifica se está ativo  
✅ Verifica se não expirou  
✅ Verifica se não atingiu limite de usos  
✅ Aplica desconto automaticamente  

### Status de Cupom

| Status | Significado | Ação |
|--------|------------|------|
| 🟢 **Ativo** | Pode ser usado | Pode revogar |
| ⏰ **Expirado** | Passou o prazo | Sistema auto-marca |
| 🔴 **Revogado** | Desativado manualmente | Não pode reativar |

---

## 🎯 Dicas & Best Practices

### ✅ Faça:

- **Use escassez real** — 48h ou 72h (não 30 dias)
- **Desconto significativo** — 10%, 15%, 25% (depende do contexto)
- **Cupom personalizado** — Um por aluno (cria senso de exclusividade)
- **Nota descritiva** — "Aluno João Silva - conversão em risco"
- **Share direto** — WhatsApp > Email > Social (urgência)

### ❌ Evite:

- ❌ Cupons muito longos (difícil decorar)
- ❌ Descontos muito altos (devalua oferta)
- ❌ Prazos muito curtos (<12h) — não dá tempo
- ❌ Reusar cupom — um aluno = um código

---

## 📱 Integração com Checkout

### No Checkout, o aluno vê:

1. Campo de cupom (opcional)
2. Coloca o código: `NATURAL48-XK7M9P`
3. Sistema valida e aplica desconto **automaticamente**
4. Mostra: "Desconto de 10% aplicado! ✓"
5. Preço final atualiza com desconto

---

## 🔒 Permissões

| Função | Pode Criar | Pode Ver | Pode Revogar |
|--------|-----------|---------|-------------|
| **Admin (Amanda)** | ✅ | ✅ | ✅ |
| **Super Admin (Gustavo)** | ✅ | ✅ | ✅ |
| **Student** | ❌ | ❌ | ❌ |

---

## 🆘 Troubleshooting

### Cupom não aparece na lista?

1. Atualize a página (F5)
2. Certifique que está logado como admin
3. Procure na lista descendo

### Aluno diz "cupom inválido"?

Verifique:
- ⏱️ Cupom expirou? (vê no dashboard: "Válido até...")
- 🔴 Cupom foi revogado? (vê status na lista)
- ⌨️ Aluno digitou certo? (NATURAL48-XK7M9P — tudo maiúsculo)

### Quer revogar um cupom?

Clique em **🔴** no cupom → Confirma → Pronto!

---

## 📊 Análise de Conversão

**Como monitorar efetividade:**

1. Vá para **Cupons** → Expandir cupom
2. Veja **"Ver uso"** → Quantas pessoas usaram
3. Veja **qual plano** compraram com o cupom
4. Compare cupons (qual desconto converte melhor?)

---

## 💡 Casos de Uso Recomendados

### Alta Conversão (10% off):
- Aluno em dúvida na semana do checkout
- Negociação por WhatsApp direto
- Oferta de "última chance"

### Média Conversão (15% off):
- Black Friday relâmpago
- Bundle offers (vários cupons)
- Reativação de leads

### Baixa Conversão (25% off):
- Mentor churn (evitar saída)
- Parceria estratégica
- Programa referral especial

---

## 📝 Resumo Rápido

| Ação | Steps |
|------|-------|
| **Criar cupom** | Dashboard → [+ Novo] → Preenche → [Gerar] |
| **Copiar código** | Clica 📋 → Pronto |
| **Copiar link** | Clica 👁️ → Compartilha |
| **Ver uso** | Clica ↓ → Expande |
| **Revogar** | Clica 🔴 → Confirma |

---

**Dúvidas?** Contate Gustavo ou Claude para ajustes.

**Última atualização:** Junho 2026
