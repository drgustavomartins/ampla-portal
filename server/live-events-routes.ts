import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

async function getDb() {
  const { db } = await import("./db");
  return db;
}

// Autenticação idêntica à usada em routes.ts
function authenticateRequest(req: Request): { userId: number; email: string } | null {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : (req.cookies?.token as string | undefined);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request, res: Response): Promise<{ userId: number } | null> {
  const auth = authenticateRequest(req);
  if (!auth) {
    res.status(401).json({ message: "Não autenticado" });
    return null;
  }
  const db = await getDb();
  const r: any = await db.execute(sql`SELECT role FROM users WHERE id = ${auth.userId}`);
  if (r.rows?.[0]?.role !== "admin") {
    res.status(403).json({ message: "Apenas administradores" });
    return null;
  }
  return { userId: auth.userId };
}

// ─── Planos que têm acesso ao Acompanhamento ─────────────────────────────────
const PLANS_WITH_ACCESS = new Set([
  "observador_essencial", "observador_avancado", "observador_intensivo",
  "imersao",
  "vip_online", "vip_presencial", "vip_completo",
  "imersao_elite",
  // Admin/testers também podem ver
  "tester", "workshop",
]);

function userHasAccess(userPlanKey: string | null | undefined, role?: string): boolean {
  if (role === "admin") return true;
  if (!userPlanKey) return false;
  return PLANS_WITH_ACCESS.has(userPlanKey);
}

export function registerLiveEventsRoutes(app: Express) {
  // ─── GET /api/acompanhamento ─────────────────────────────────────────────
  // Retorna: próximos encontros, encontros passados (com gravação e casos),
  // créditos ganhos por participação, estatísticas.
  app.get("/api/acompanhamento", async (req: Request, res: Response) => {
    try {
      const auth = authenticateRequest(req);
      if (!auth) return res.status(401).json({ message: "Não autenticado" });
      const db = await getDb();

      // Buscar plano do usuário
      const userResult: any = await db.execute(
        sql`SELECT plan_key, role FROM users WHERE id = ${auth.userId}`
      );
      const userRow = userResult.rows?.[0];
      if (!userRow) return res.status(404).json({ message: "Usuário não encontrado" });

      const hasAccess = userHasAccess(userRow.plan_key as string, userRow.role as string);

      const nowIso = new Date().toISOString();

      // Próximos encontros (todos podem ver, mas só quem tem acesso vê o link de entrada)
      const upcomingResult: any = await db.execute(sql`
        SELECT id, title, description, theme, event_date, duration_minutes, meet_link, status
        FROM live_events
        WHERE event_date >= ${nowIso}
          AND status IN ('scheduled', 'live')
        ORDER BY event_date ASC
        LIMIT 10
      `);

      const upcoming = (upcomingResult.rows || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        theme: e.theme,
        eventDate: e.event_date,
        durationMinutes: e.duration_minutes,
        meetLink: hasAccess ? e.meet_link : null,
        status: e.status,
      }));

      // Encontros passados (últimos 12) com casos e gravação
      const pastResult: any = await db.execute(sql`
        SELECT e.id, e.title, e.theme, e.event_date, e.recording_url,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                   'id', c.id,
                   'title', c.title,
                   'summary', c.summary,
                   'tags', c.tags
                 ) ORDER BY c."order", c.id)
                 FROM live_event_cases c WHERE c.event_id = e.id),
                 '[]'::json
               ) AS cases,
               (SELECT COUNT(*)::int FROM live_event_attendance a WHERE a.event_id = e.id AND a.attended = true) AS attendees_count
        FROM live_events e
        WHERE e.event_date < ${nowIso}
          AND e.status IN ('completed', 'recorded')
        ORDER BY e.event_date DESC
        LIMIT 12
      `);

      const past = (pastResult.rows || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        theme: e.theme,
        eventDate: e.event_date,
        recordingUrl: hasAccess ? e.recording_url : null,
        cases: e.cases || [],
        attendeesCount: e.attendees_count || 0,
      }));

      // Histórico de créditos ganhos em acompanhamentos deste usuário
      const creditsResult: any = await db.execute(sql`
        SELECT a.id, a.event_id, a.credits_awarded, a.camera_on, a.active_participation,
               a.note, a.created_at,
               e.title AS event_title, e.event_date
        FROM live_event_attendance a
        JOIN live_events e ON e.id = a.event_id
        WHERE a.user_id = ${auth.userId}
          AND a.credits_awarded > 0
        ORDER BY e.event_date DESC
      `);

      const creditsHistory = (creditsResult.rows || []).map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        eventTitle: r.event_title,
        eventDate: r.event_date,
        creditsAwarded: r.credits_awarded,
        cameraOn: r.camera_on,
        activeParticipation: r.active_participation,
        note: r.note,
      }));

      // Totais
      const totalCredits = creditsHistory.reduce((s: number, r: any) => s + r.creditsAwarded, 0);
      const totalAttended = creditsHistory.length;

      return res.json({
        hasAccess,
        userPlanKey: userRow.plan_key,
        upcoming,
        past,
        creditsHistory,
        stats: {
          totalCreditsFromEvents: totalCredits,
          totalAttended,
        },
      });
    } catch (err: any) {
      console.error("[live-events] GET /api/acompanhamento error:", err);
      return res.status(500).json({ message: "Erro ao carregar acompanhamento" });
    }
  });

  // ─── ADMIN: CRUD de encontros ────────────────────────────────────────────
  // GET /api/admin/live-events — lista todos
  app.get("/api/admin/live-events", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const db = await getDb();
      const r: any = await db.execute(sql`
        SELECT e.*, 
               (SELECT COUNT(*)::int FROM live_event_attendance a WHERE a.event_id = e.id) AS attendance_count,
               (SELECT COUNT(*)::int FROM live_event_cases c WHERE c.event_id = e.id) AS cases_count
        FROM live_events e
        ORDER BY event_date DESC
        LIMIT 100
      `);
      return res.json({ events: r.rows || [] });
    } catch (err: any) {
      console.error("[live-events] GET /admin error:", err);
      return res.status(500).json({ message: "Erro" });
    }
  });

  // POST /api/admin/live-events — criar encontro
  app.post("/api/admin/live-events", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const { title, description, theme, eventDate, durationMinutes, meetLink } = req.body;
      if (!title || !eventDate) {
        return res.status(400).json({ message: "Título e data são obrigatórios" });
      }
      const db = await getDb();
      const now = new Date().toISOString();
      const r: any = await db.execute(sql`
        INSERT INTO live_events (title, description, theme, event_date, duration_minutes, meet_link, status, created_by, created_at)
        VALUES (${title}, ${description || null}, ${theme || null}, ${eventDate}, ${durationMinutes || 90}, ${meetLink || null}, 'scheduled', ${a.userId}, ${now})
        RETURNING *
      `);
      return res.json({ event: r.rows?.[0] });
    } catch (err: any) {
      console.error("[live-events] POST /admin error:", err);
      return res.status(500).json({ message: "Erro ao criar" });
    }
  });

  // PUT /api/admin/live-events/:id — atualizar encontro (incluindo recording_url e status)
  app.put("/api/admin/live-events/:id", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const id = Number(req.params.id);
      const { title, description, theme, eventDate, durationMinutes, meetLink, recordingUrl, status } = req.body;
      const db = await getDb();
      const r: any = await db.execute(sql`
        UPDATE live_events SET
          title = COALESCE(${title ?? null}, title),
          description = COALESCE(${description ?? null}, description),
          theme = COALESCE(${theme ?? null}, theme),
          event_date = COALESCE(${eventDate ?? null}, event_date),
          duration_minutes = COALESCE(${durationMinutes ?? null}, duration_minutes),
          meet_link = COALESCE(${meetLink ?? null}, meet_link),
          recording_url = COALESCE(${recordingUrl ?? null}, recording_url),
          status = COALESCE(${status ?? null}, status)
        WHERE id = ${id}
        RETURNING *
      `);
      return res.json({ event: r.rows?.[0] });
    } catch (err: any) {
      console.error("[live-events] PUT /admin error:", err);
      return res.status(500).json({ message: "Erro ao atualizar" });
    }
  });

  // DELETE /api/admin/live-events/:id
  app.delete("/api/admin/live-events/:id", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const id = Number(req.params.id);
      const db = await getDb();
      await db.execute(sql`DELETE FROM live_event_cases WHERE event_id = ${id}`);
      await db.execute(sql`DELETE FROM live_event_attendance WHERE event_id = ${id}`);
      await db.execute(sql`DELETE FROM live_events WHERE id = ${id}`);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[live-events] DELETE /admin error:", err);
      return res.status(500).json({ message: "Erro ao excluir" });
    }
  });

  // POST /api/admin/live-events/:id/cases — adicionar caso
  app.post("/api/admin/live-events/:id/cases", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const eventId = Number(req.params.id);
      const { title, summary, presentedBy, tags, order } = req.body;
      if (!title) return res.status(400).json({ message: "Título obrigatório" });
      const db = await getDb();
      const now = new Date().toISOString();
      const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
      const r: any = await db.execute(sql`
        INSERT INTO live_event_cases (event_id, title, summary, presented_by, tags, "order", created_at)
        VALUES (${eventId}, ${title}, ${summary || null}, ${presentedBy || null}, ${tagsJson}, ${order || 0}, ${now})
        RETURNING *
      `);
      return res.json({ case: r.rows?.[0] });
    } catch (err: any) {
      console.error("[live-events] POST /cases error:", err);
      return res.status(500).json({ message: "Erro" });
    }
  });

  // DELETE /api/admin/live-events/cases/:caseId
  app.delete("/api/admin/live-events/cases/:caseId", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const caseId = Number(req.params.caseId);
      const db = await getDb();
      await db.execute(sql`DELETE FROM live_event_cases WHERE id = ${caseId}`);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ message: "Erro" });
    }
  });

  // POST /api/admin/live-events/:id/attendance — registrar presença + créditos
  app.post("/api/admin/live-events/:id/attendance", async (req: Request, res: Response) => {
    const a = await requireAdmin(req, res);
    if (!a) return;
    try {
      const eventId = Number(req.params.id);
      const { userId, attended, cameraOn, activeParticipation, creditsAwarded, note } = req.body;
      if (!userId) return res.status(400).json({ message: "userId obrigatório" });
      const db = await getDb();
      const now = new Date().toISOString();

      // Upsert presença
      const existing: any = await db.execute(sql`
        SELECT id FROM live_event_attendance WHERE event_id = ${eventId} AND user_id = ${userId}
      `);
      if (existing.rows?.length) {
        await db.execute(sql`
          UPDATE live_event_attendance SET
            attended = ${!!attended},
            camera_on = ${!!cameraOn},
            active_participation = ${!!activeParticipation},
            credits_awarded = ${creditsAwarded || 0},
            note = ${note || null},
            marked_by = ${a.userId}
          WHERE id = ${existing.rows[0].id}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO live_event_attendance (event_id, user_id, attended, camera_on, active_participation, credits_awarded, note, marked_by, created_at)
          VALUES (${eventId}, ${userId}, ${!!attended}, ${!!cameraOn}, ${!!activeParticipation}, ${creditsAwarded || 0}, ${note || null}, ${a.userId}, ${now})
        `);
      }

      // Lança crédito na carteira se houver
      if (creditsAwarded && creditsAwarded > 0) {
        const evRow: any = await db.execute(sql`SELECT title FROM live_events WHERE id = ${eventId}`);
        const title = evRow.rows?.[0]?.title || "Acompanhamento";
        const expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();
        const refId = `live_event_${eventId}_${userId}`;
        // evita duplicata
        const dupe: any = await db.execute(sql`SELECT id FROM credit_transactions WHERE reference_id = ${refId} LIMIT 1`);
        if (!dupe.rows?.length) {
          await db.execute(sql`
            INSERT INTO credit_transactions (user_id, type, amount, description, reference_id, created_at, expires_at)
            VALUES (${userId}, 'acompanhamento', ${creditsAwarded}, ${`Participação ativa: ${title}`}, ${refId}, ${now}, ${expiresAt})
          `);
        }
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[live-events] POST /attendance error:", err);
      return res.status(500).json({ message: "Erro" });
    }
  });
}
