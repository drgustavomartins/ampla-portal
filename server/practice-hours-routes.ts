// server/routes.ts - Adicione este endpoint

import { Router } from 'express';
import { sql } from '@vercel/postgres';
import { authenticateToken, requireAdmin } from './middleware';

const router = Router();

/**
 * GET /api/admin/practice-hours
 * Retorna lista de alunos com horas de prática pendentes
 * Requer autenticação e role admin
 */
router.get('/api/admin/practice-hours', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id as "studentId",
        u.name as "studentName",
        u.email as "studentEmail",
        p.name as "planName",
        COALESCE(mp.required_hours, 0) as "totalRequiredHours",
        COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) as "completedHours",
        COALESCE(mp.required_hours, 0) - COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) as "pendingHours",
        ROUND(
          CASE 
            WHEN COALESCE(mp.required_hours, 0) = 0 THEN 0
            ELSE (COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) * 100.0) / COALESCE(mp.required_hours, 0)
          END, 2
        ) as "percentageComplete",
        ep.created_at as "enrollmentDate",
        MAX(ph.updated_at) as "lastActivityDate",
        CASE 
          WHEN COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) >= COALESCE(mp.required_hours, 0) 
            THEN 'completed'
          WHEN COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) >= COALESCE(mp.required_hours, 0) * 0.75 
            THEN 'in-progress'
          WHEN NOW() > ep.created_at + INTERVAL '6 months' 
            THEN 'overdue'
          WHEN COALESCE(SUM(CASE WHEN ph.status = 'completed' THEN ph.hours ELSE 0 END), 0) < COALESCE(mp.required_hours, 0) * 0.5 
            THEN 'at-risk'
          ELSE 'in-progress'
        END as status
      FROM users u
      LEFT JOIN enrollments ep ON u.id = ep.user_id
      LEFT JOIN plans p ON ep.plan_id = p.id
      LEFT JOIN module_provisioning mp ON ep.plan_id = mp.plan_id
      LEFT JOIN practice_hours ph ON u.id = ph.user_id AND ep.id = ph.enrollment_id
      WHERE 
        ep.is_active = true 
        AND (p.name ILIKE '%NaturalUp%' OR p.name ILIKE '%Imersão%')
      GROUP BY u.id, u.name, u.email, p.name, mp.required_hours, ep.created_at, ep.id
      ORDER BY "pendingHours" DESC
    `;

    const result = await sql.query(query);
    
    // Formatar resposta
    const students = result.rows.map(row => ({
      studentId: row.studentId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      planName: row.planName,
      totalRequiredHours: parseFloat(row.totalRequiredHours),
      completedHours: parseFloat(row.completedHours),
      pendingHours: parseFloat(row.pendingHours),
      percentageComplete: parseFloat(row.percentageComplete),
      enrollmentDate: row.enrollmentDate,
      lastActivityDate: row.lastActivityDate,
      status: row.status
    }));

    res.json(students);
  } catch (error) {
    console.error('Erro ao buscar horas de prática:', error);
    res.status(500).json({ 
      error: 'Falha ao buscar dados de prática supervisionada' 
    });
  }
});

/**
 * POST /api/admin/practice-hours/:enrollmentId
 * Registra horas de prática para um aluno
 */
router.post('/api/admin/practice-hours/:enrollmentId', authenticateToken, requireAdmin, async (req, res) => {
  const { enrollmentId } = req.params;
  const { userId, hours, description, supervisorNotes } = req.body;

  if (!hours || hours <= 0) {
    return res.status(400).json({ error: 'Horas devem ser maiores que 0' });
  }

  try {
    const result = await sql.query(
      `INSERT INTO practice_hours (user_id, enrollment_id, hours, description, supervisor_notes, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')
       RETURNING *`,
      [userId, enrollmentId, hours, description || null, supervisorNotes || null]
    );

    res.json({ 
      message: 'Horas de prática registradas com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao registrar horas:', error);
    res.status(500).json({ 
      error: 'Falha ao registrar horas de prática' 
    });
  }
});

/**
 * GET /api/admin/practice-hours/:studentId/detail
 * Retorna detalhe de todas as horas de um aluno
 */
router.get('/api/admin/practice-hours/:studentId/detail', authenticateToken, requireAdmin, async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await sql.query(
      `SELECT 
        ph.id,
        ph.hours,
        ph.description,
        ph.supervisor_notes,
        ph.status,
        ph.created_at,
        ph.updated_at,
        u.name as supervisor_name
      FROM practice_hours ph
      LEFT JOIN users u ON ph.created_by = u.id
      WHERE ph.user_id = $1
      ORDER BY ph.created_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar detalhe de horas:', error);
    res.status(500).json({ 
      error: 'Falha ao buscar histórico de horas' 
    });
  }
});

export default router;
