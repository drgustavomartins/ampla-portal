# Guia de Implementação: Aba de Horas de Prática Supervisionada

## 📋 Visão Geral
Este guia detalha como integrar a visualização de horas de prática supervisionada ao portal Ampla Facial.

---

## 1️⃣ Preparar o Banco de Dados

### 1.1 - Executar migração SQL
Acesse o Neon Console (https://console.neon.tech) e execute o SQL em `migration-practice-hours.sql`:

```sql
-- Copie e execute todo o conteúdo de migration-practice-hours.sql
-- Isso criará:
-- - Tabela practice_hours (registro de horas)
-- - Tabela module_provisioning (requisitos por plano)
-- - Índices e triggers automaticamente
```

**Verificar:**
```sql
SELECT * FROM practice_hours LIMIT 1;  -- Deve retornar vazio (OK)
SELECT * FROM module_provisioning;     -- Deve mostrar planos com horas requeridas
```

---

## 2️⃣ Implementar Backend

### 2.1 - Adicionar rotas no `server/routes.ts`

Abra seu arquivo `server/routes.ts` e adicione o código de `practice-hours-routes.ts` **antes** do export final:

```typescript
// server/routes.ts

import { Router } from 'express';
// ... imports existentes ...

const router = Router();

// ... suas rotas existentes ...

// ===== ADICIONE AQUI (Bloco de Prática Supervisionada) =====
router.get('/api/admin/practice-hours', authenticateToken, requireAdmin, async (req, res) => {
  // ... código completo de practice-hours-routes.ts ...
});

router.post('/api/admin/practice-hours/:enrollmentId', authenticateToken, requireAdmin, async (req, res) => {
  // ... código completo ...
});

router.get('/api/admin/practice-hours/:studentId/detail', authenticateToken, requireAdmin, async (req, res) => {
  // ... código completo ...
});
// ===== FIM DO BLOCO =====

export default router;
```

### 2.2 - Verificar middlewares
Certifique-se que `authenticateToken` e `requireAdmin` existem em `server/middleware.ts`:

```typescript
// Exemplo esperado (pode variar)
export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a admins' });
  }
  next();
};
```

---

## 3️⃣ Implementar Frontend

### 3.1 - Copiar componente React
Coloque o arquivo `PracticeHoursTab.tsx` em:
```
client/src/components/PracticeHoursTab.tsx
```

### 3.2 - Integrar ao Admin Dashboard
Abra `client/src/pages/admin-dashboard.tsx` e adicione:

```typescript
import PracticeHoursTab from '@/components/PracticeHoursTab';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users'); // ou 'practice-hours'
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Usuários
        </button>
        {/* ADICIONE ESTA ABA */}
        <button 
          onClick={() => setActiveTab('practice-hours')}
          className={`px-4 py-2 rounded ${activeTab === 'practice-hours' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          📊 Horas de Prática
        </button>
      </div>

      {activeTab === 'users' && <UsersTab />}
      {/* ADICIONE ESTE CONDICIONAL */}
      {activeTab === 'practice-hours' && <PracticeHoursTab />}
    </div>
  );
}
```

### 3.3 - Garantir componentes de UI
Certifique-se que tem os componentes shadcn/ui:
```bash
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add alert
```

---

## 4️⃣ Alimentar Dados Iniciais

### 4.1 - Script para registrar horas (modo manual)

Acesse o console Neon e execute:

```sql
-- Exemplo: Registrar 30 horas de prática para o aluno ID xyz
INSERT INTO practice_hours (user_id, enrollment_id, hours, description, status)
SELECT 
  u.id,
  e.id,
  30,
  'Prática clínica supervisionada - Preenchedores com AH',
  'completed'
FROM users u
JOIN enrollments e ON u.id = e.user_id
WHERE u.email = 'aluno@email.com'  -- Troque pelo email real
  AND e.is_active = true
LIMIT 1;
```

### 4.2 - Endpoint para registrar horas (via API)

POST para `/api/admin/practice-hours/{enrollmentId}`:

```bash
curl -X POST "https://portal.amplafacial.com.br/api/admin/practice-hours/enroll-uuid" \
  -H "Authorization: Bearer seu-token-jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "hours": 15,
    "description": "Aula prática: Preenchedores com AH",
    "supervisorNotes": "Aluno demonstrou excelente técnica"
  }'
```

---

## 5️⃣ Configuração de Planos

### 5.1 - Definir horas requeridas

O script SQL já configura:
- **Imersão**: 120 horas
- **NaturalUp® VIP**: 60 horas

Para ajustar, execute:

```sql
UPDATE module_provisioning
SET required_hours = 100
WHERE plan_id IN (SELECT id FROM plans WHERE name ILIKE '%Imersão%');
```

---

## 6️⃣ Statuses e Cores

O componente usa automaticamente:

| Status | Condição | Cor |
|--------|----------|-----|
| **Completo** ✅ | 100% de horas | Verde |
| **Em Progresso** ⏳ | 75-99% | Azul |
| **Atenção** ⚠️ | <50% ou + de 6 meses | Amarelo |
| **Vencido** ❌ | > 6 meses sem conclusão | Vermelho |

---

## 7️⃣ Testes

### 7.1 - Testar Endpoints

```bash
# 1. Listar horas de prática
curl -H "Authorization: Bearer seu-token" \
  "https://portal.amplafacial.com.br/api/admin/practice-hours"

# 2. Ver detalhes de um aluno
curl -H "Authorization: Bearer seu-token" \
  "https://portal.amplafacial.com.br/api/admin/practice-hours/aluno-uuid/detail"

# 3. Registrar nova prática
curl -X POST -H "Authorization: Bearer seu-token" \
  -H "Content-Type: application/json" \
  -d '{"userId":"...","hours":10,"description":"..."}' \
  "https://portal.amplafacial.com.br/api/admin/practice-hours/enrollment-uuid"
```

### 7.2 - Validar no Frontend

1. Acesse Dashboard Admin
2. Clique em "📊 Horas de Prática"
3. Verifique:
   - ✅ Carrega lista de alunos
   - ✅ Filtros funcionam
   - ✅ Progresso visual correto
   - ✅ Cards de resumo atualizam

---

## 8️⃣ Personalização & Extensões

### Adicionar coluna "Observações"
No componente React, descomente:
```typescript
<p className="text-sm text-gray-600">
  {student.supervisorNotes}
</p>
```

### Exportar para Excel
Adicione ao componente:
```typescript
const exportToCSV = () => {
  const csv = filteredStudents.map(s => 
    `${s.studentName},${s.studentEmail},${s.pendingHours},${s.percentageComplete}%`
  ).join('\n');
  // Download lógico...
};
```

### Integrar com WhatsApp
Envie notificações quando aluno completa 100%:
```typescript
if (student.status === 'completed') {
  sendWhatsAppNotification(student.studentPhone, 
    `Parabéns! Você concluiu todas as horas de prática supervisionada! 🎉`
  );
}
```

---

## 🔐 Segurança

✅ **Implementado:**
- JWT obrigatório
- Apenas admins acessam dados
- Validação de horas > 0
- Auditoria de quem registrou (created_by)

⚠️ **Considere adicionar:**
```typescript
// Rate limiting
const rateLimit = require('express-rate-limit');
const practiceLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

router.post('/api/admin/practice-hours/:enrollmentId', practiceLimit, ...);
```

---

## 📞 Suporte

Se encontrar erros:

1. **"Não autorizado"** → Verifique JWT e role 'admin'
2. **"Tabela não existe"** → Execute migration SQL novamente
3. **Dados vazios** → Insira dados iniciais via SQL
4. **Componente não renderiza** → Verificar imports de UI components

---

## 📦 Checklist de Deploy

- [ ] Migração SQL executada com sucesso
- [ ] Rotas adicionadas em `server/routes.ts`
- [ ] Componente copiado para `client/src/components/`
- [ ] Integrado ao AdminDashboard
- [ ] Componentes shadcn/ui instalados
- [ ] Dados iniciais carregados
- [ ] Testado em desenvolvimento
- [ ] Deploy para produção via GitHub/Vercel
