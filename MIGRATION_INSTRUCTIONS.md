# 🗄️ Executar Migration de Cupons no Neon

## Método: SQL Editor do Neon Console

### Passo 1: Acessar Neon Dashboard
1. Vá para: https://console.neon.tech
2. Login com suas credenciais
3. Selecione projeto: **neondb**

### Passo 2: Abrir SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Certifique que está conectado à branch **main** e database **neondb**

### Passo 3: Copiar e Colar SQL

**Copie TODO o código abaixo e cole no SQL Editor:**

```sql
-- ========== CRIAR TABELA DE CUPONS ==========
CREATE TABLE IF NOT EXISTS discount_coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  valid_until TEXT NOT NULL,
  product_type VARCHAR(50) NOT NULL DEFAULT 'all',
  max_uses INTEGER DEFAULT -1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  description TEXT
);

-- ========== CRIAR ÍNDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_discount_coupons_code ON discount_coupons(code);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_status ON discount_coupons(status);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_valid_until ON discount_coupons(valid_until);

-- ========== CRIAR TABELA DE HISTÓRICO DE USO ==========
CREATE TABLE IF NOT EXISTS coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES discount_coupons(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  used_at TEXT NOT NULL,
  plan_key VARCHAR(50),
  amount_saved INTEGER
);

-- ========== CRIAR ÍNDICES DE HISTÓRICO ==========
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
```

### Passo 4: Executar
1. Clique em **Execute** (ou Cmd+Enter)
2. Aguarde a execução (deve ser rápido)

### Passo 5: Verificar Sucesso

Cole isso no SQL Editor para confirmar:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('discount_coupons', 'coupon_usage')
ORDER BY table_name;
```

**Você deve ver:**
- `coupon_usage`
- `discount_coupons`

✅ Se aparecer essas duas tabelas, está tudo ok!

---

## Método Alternativo: Via Terminal (psql)

Se preferir usar terminal:

```bash
# 1. Instalar psql se não tiver:
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client
# Windows: https://www.postgresql.org/download/windows/

# 2. Conectar ao banco:
psql postgresql://neondb_owner:npg_KHvsQVDh8E6F@ep-empty-base-actz06qd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

# 3. Dentro do psql, copie e cole o SQL acima (dos passos 1-4)

# 4. Sair:
\q
```

---

## Conferir se deu certo

Após executar, no SQL Editor rode:

```sql
-- Ver estrutura da tabela discount_coupons
\d discount_coupons

-- Ver tudo que foi criado
SELECT * FROM discount_coupons LIMIT 1;
SELECT * FROM coupon_usage LIMIT 1;
```

Se não der erro, está perfeito! ✅

---

## ⏱️ Tempo esperado

- **Execução SQL:** < 1 segundo
- **Verificação:** < 1 segundo
- **Total:** ~2 segundos

---

## ❌ Se der erro

### Erro: "relation 'users' does not exist"
**Solução:** Tabela `users` não existe. Certifique-se de estar no banco `neondb` certo.

### Erro: "duplicate key value violates unique constraint"
**Solução:** Tabelas já existem. Tudo ok! O `IF NOT EXISTS` evita erro.

### Erro: "permission denied"
**Solução:** Usuário não tem permissão. Use `neondb_owner` (já está certo).

---

## 📍 Próximo Passo

Após executar a migration:
1. **Espere o deploy do Vercel** (GitHub Actions dispara automaticamente)
2. **Acesse:** https://portal.amplafacial.com.br
3. **Login:** Como Amanda (amandavivario@gmail.com)
4. **Teste:** Admin Dashboard → Aba "Cupons" → [+ Novo Cupom]

---

**Precisa de ajuda?** Me manda print do erro que aparecer!
