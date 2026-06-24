-- Migration: Create practice_hours table for supervised practice tracking
-- Este arquivo deve ser executado no banco Neon PostgreSQL

CREATE TABLE IF NOT EXISTS practice_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  
  -- Dados de prática
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  supervisor_notes TEXT,
  
  -- Status da prática
  status VARCHAR(20) NOT NULL DEFAULT 'completed' 
    CHECK (status IN ('pending', 'in-review', 'completed', 'rejected')),
  
  -- Quem registrou (pode ser o supervisor ou o próprio aluno)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  
  -- Índices para performance
  CONSTRAINT valid_hours CHECK (hours > 0 AND hours <= 24)
);

-- Índices para buscas rápidas
CREATE INDEX idx_practice_hours_user_id ON practice_hours(user_id);
CREATE INDEX idx_practice_hours_enrollment_id ON practice_hours(enrollment_id);
CREATE INDEX idx_practice_hours_status ON practice_hours(status);
CREATE INDEX idx_practice_hours_created_at ON practice_hours(created_at DESC);
CREATE INDEX idx_practice_hours_user_enrollment ON practice_hours(user_id, enrollment_id);

-- Tabela de requisitos de horas por plano
CREATE TABLE IF NOT EXISTS module_provisioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  
  required_hours INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(plan_id, module_id)
);

CREATE INDEX idx_module_provisioning_plan_id ON module_provisioning(plan_id);
CREATE INDEX idx_module_provisioning_module_id ON module_provisioning(module_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_practice_hours_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_practice_hours_updated_at ON practice_hours;
CREATE TRIGGER trigger_practice_hours_updated_at
BEFORE UPDATE ON practice_hours
FOR EACH ROW
EXECUTE FUNCTION update_practice_hours_timestamp();

-- Dados iniciais: Definir horas requeridas para cada plano
-- Imersão: 120 horas de prática supervisionada
-- NaturalUp® VIP: 60 horas de prática supervisionada

INSERT INTO module_provisioning (plan_id, required_hours)
SELECT p.id, 
  CASE 
    WHEN p.name ILIKE '%Imersão%' THEN 120
    WHEN p.name ILIKE '%NaturalUp%' THEN 60
    ELSE 0
  END
FROM plans p
ON CONFLICT DO NOTHING;
