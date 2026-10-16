/**
 * Lote promocional da Plataforma Online (plataforma_anual).
 *
 * Regra REAL (não é só texto de página): as primeiras `limit` matrículas pagas
 * a partir de `startAt` saem por `lotePrice`. Quando o lote esgota, o preço de
 * plataforma_anual passa a ser `fullPrice` em TODO o portal (vitrine, checkout
 * Asaas/Stripe, contrato), porque ajustamos PLANS.plataforma_anual.price antes
 * de qualquer rota de API ler o preço.
 *
 * Para abrir um novo lote: mude startAt (e, se quiser, limit/lotePrice) e publique.
 * Para desligar o lote: enabled = false — o preço volta ao valor base de
 * stripe-plans.ts (hoje R$ 479).
 */
import type { Express, Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { PLANS } from "./stripe-plans";
import { installmentValueCents } from "./asaas";

export const ONLINE_LOTE = {
  enabled: true,
  planKey: "plataforma_anual" as const,
  startAt: "2026-10-16T13:00:00-03:00",
  limit: 30,
  lotePrice: 47900, // R$ 479,00
  fullPrice: 99890, // R$ 998,90
};

const BASE_PRICE: number = (PLANS as any)[ONLINE_LOTE.planKey].price;

type LoteStatus = {
  enabled: boolean;
  sold: number;
  remaining: number;
  limit: number;
  soldOut: boolean;
  price: number;
  lotePrice: number;
  fullPrice: number;
};

let cache: { at: number; status: LoteStatus } | null = null;
const TTL_MS = 20_000;

export async function getOnlineLoteStatus(force = false): Promise<LoteStatus> {
  if (!ONLINE_LOTE.enabled) {
    (PLANS as any)[ONLINE_LOTE.planKey].price = BASE_PRICE;
    return { enabled: false, sold: 0, remaining: 0, limit: 0, soldOut: false, price: BASE_PRICE, lotePrice: BASE_PRICE, fullPrice: BASE_PRICE };
  }
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.status;
  let sold = 0;
  try {
    const { db } = await import("./db");
    const r: any = await db.execute(sql`
      SELECT COUNT(*)::int AS sold
      FROM users
      WHERE plan_key = ${ONLINE_LOTE.planKey}
        AND plan_paid_at IS NOT NULL
        AND plan_paid_at >= ${ONLINE_LOTE.startAt}::timestamptz
        AND COALESCE(plan_amount_paid, 0) > 0
    `);
    sold = r.rows?.[0]?.sold || 0;
  } catch (err) {
    console.error("[online-lote] count error:", err);
    // Em erro, mantém o último status conhecido (ou assume lote aberto).
    if (cache) return cache.status;
  }
  const remaining = Math.max(0, ONLINE_LOTE.limit - sold);
  const soldOut = remaining <= 0;
  const status: LoteStatus = {
    enabled: true,
    sold,
    remaining,
    limit: ONLINE_LOTE.limit,
    soldOut,
    price: soldOut ? ONLINE_LOTE.fullPrice : ONLINE_LOTE.lotePrice,
    lotePrice: ONLINE_LOTE.lotePrice,
    fullPrice: ONLINE_LOTE.fullPrice,
  };
  cache = { at: Date.now(), status };
  return status;
}

async function applyOnlineLotePrice() {
  const s = await getOnlineLoteStatus();
  (PLANS as any)[ONLINE_LOTE.planKey].price = s.price;
}

export function registerOnlineLote(app: Express) {
  // Antes de qualquer rota de API: garante que PLANS reflete o lote atual.
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/") || req.path === "/api/online-lote") return next();
    try { await applyOnlineLotePrice(); } catch { /* não bloqueia a requisição */ }
    next();
  });

  // Público — usado pela página de venda (amplafacial.com.br/online) e pela vitrine.
  app.get("/api/online-lote", async (_req: Request, res: Response) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    const s = await getOnlineLoteStatus();
    (PLANS as any)[ONLINE_LOTE.planKey].price = s.price;
    res.json({
      ...s,
      priceFormatted: (s.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      installment12x: installmentValueCents(s.price, 12),
    });
  });
}
