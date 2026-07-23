// ─── Integração Asaas ─────────────────────────────────────────────────────────
// Substitui o Stripe para cobranças no Brasil (Pix, boleto e cartão com
// parcelamento em até 21x).
//
// Regra comercial (definida em 23/07/2026):
//   • 1x a 12x  → SEM JUROS. A Ampla Facial absorve a taxa do Asaas.
//   • 13x a 21x → COM JUROS. O cliente assume o custo do prazo estendido.
//
// A taxa real do Asaas NÃO é fixa por parcela (as páginas de marketing dizem
// que é, mas a tabela da conta desmente). Valores lidos de /v3/myAccount/fees
// em 23/07/2026 para a conta do Instituto Medeiros Martins:
//
//   Parcelas   Taxa cheia   Taxa promocional (até 23/10/2026)
//   1x         2,99%        1,99%
//   2–6x       3,49%        2,49%
//   7–12x      3,99%        2,99%
//   13–21x     4,29%        3,29%
//   + R$ 0,49 por cobrança · recebimento em 32 dias
//   Antecipação: 1,25%/mês à vista · 1,70%/mês parcelado
//
// PONTO DE NEUTRALIDADE: antecipando tudo a 1,70%/mês, a taxa mensal que faz
// o 21x render o MESMO líquido do 12x é ~0,86% a.m. (acréscimo de ~10% no
// total). Qualquer coisa acima disso é margem.

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Juros mensais aplicados de 13x a 21x.
 *
 *   0.0086 → neutro. Só repõe o custo de antecipação. Máxima competitividade.
 *   0.0199 → padrão de mercado (Mercado Pago, PagSeguro). Gera margem.
 *
 * Trocar AQUI e em lugar nenhum mais — todo o resto deriva desta constante.
 */
export const MONTHLY_INTEREST_RATE = 0.0199;

/** Até aqui é sem juros (Ampla Facial absorve a taxa). */
export const MAX_INSTALLMENTS_NO_INTEREST = 12;

/**
 * Teto absoluto do Asaas. ATENÇÃO: 13x a 21x só funciona em Visa e Mastercard.
 * Elo, Amex, Hiper e Hipercard ficam limitados a 12x — o checkout do Asaas já
 * trata isso sozinho, escondendo as opções acima de 12x quando a bandeira não
 * suporta. Não precisamos filtrar no nosso lado.
 */
export const MAX_INSTALLMENTS = 21;

const ASAAS_ENV = process.env.ASAAS_ENV === "sandbox" ? "sandbox" : "production";

export const ASAAS_API_URL =
  ASAAS_ENV === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";

/** URL pública do checkout hospedado, montada a partir do id retornado. */
export function checkoutUrl(checkoutId: string): string {
  const host = ASAAS_ENV === "sandbox" ? "sandbox.asaas.com" : "asaas.com";
  return `https://${host}/checkoutSession/show?id=${checkoutId}`;
}

function getApiKey(): string | null {
  return process.env.ASAAS_API_KEY ?? null;
}

export function isAsaasConfigured(): boolean {
  return !!getApiKey();
}

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────

export class AsaasError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Array<{ code: string; description: string }> = [],
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

export async function asaasRequest<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AsaasError("ASAAS_API_KEY não configurada no ambiente.", 500);
  }

  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      access_token: apiKey,
      accept: "application/json",
      "content-type": "application/json",
      // O Asaas usa este header para rastrear a origem das integrações.
      "User-Agent": "AmplaFacial-Portal",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new AsaasError(
      `Resposta não-JSON do Asaas (${res.status}): ${text.slice(0, 200)}`,
      res.status,
    );
  }

  if (!res.ok || json?.errors) {
    const errors = json?.errors ?? [];
    const description =
      errors.map((e: any) => e.description).join(" · ") || `HTTP ${res.status}`;
    throw new AsaasError(description, res.status, errors);
  }

  return json as T;
}

// ─── Matemática do parcelamento ───────────────────────────────────────────────

export interface InstallmentOption {
  count: number;
  /** Valor de cada parcela, em centavos. */
  valueCents: number;
  /** Total pago pelo cliente, em centavos. */
  totalCents: number;
  hasInterest: boolean;
  /** Ex.: "12x de R$ 1.445,83 sem juros" */
  label: string;
}

/**
 * Valor da parcela, em centavos.
 *
 * Até 12x: divisão simples (o resto de centavos é distribuído pelo Asaas,
 * porque nesse caso mandamos totalValue em vez de installmentValue).
 * Acima de 12x: Tabela Price sobre MONTHLY_INTEREST_RATE.
 */
export function installmentValueCents(priceCents: number, count: number): number {
  if (count < 1 || count > MAX_INSTALLMENTS) {
    throw new Error(`Número de parcelas inválido: ${count}`);
  }
  if (count <= MAX_INSTALLMENTS_NO_INTEREST) {
    return Math.round(priceCents / count);
  }
  const i = MONTHLY_INTEREST_RATE;
  const pmt = (priceCents * i) / (1 - Math.pow(1 + i, -count));
  // Arredonda pra cima: nunca receber menos que o valor presente.
  return Math.ceil(pmt);
}

export function formatBRLCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Monta todas as opções de parcelamento de um preço. */
export function buildInstallmentOptions(
  priceCents: number,
  maxCount: number = MAX_INSTALLMENTS,
): InstallmentOption[] {
  if (priceCents <= 0) return [];
  const options: InstallmentOption[] = [];

  for (let n = 1; n <= Math.min(maxCount, MAX_INSTALLMENTS); n++) {
    const valueCents = installmentValueCents(priceCents, n);
    const hasInterest = n > MAX_INSTALLMENTS_NO_INTEREST;
    const totalCents = hasInterest ? valueCents * n : priceCents;
    const suffix = hasInterest ? "com juros" : "sem juros";
    options.push({
      count: n,
      valueCents,
      totalCents,
      hasInterest,
      label:
        n === 1
          ? `À vista ${formatBRLCents(priceCents)}`
          : `${n}x de ${formatBRLCents(valueCents)} ${suffix}`,
    });
  }

  return options;
}

/**
 * Payload de parcelamento para o Asaas.
 *
 * Sem juros → manda totalValue e deixa o Asaas distribuir os centavos, evitando
 * que 12 × R$ 39,92 dê R$ 479,04 em vez de R$ 479,00.
 * Com juros → manda installmentValue, porque o total É maior que o preço base.
 */
export function asaasInstallmentPayload(priceCents: number, count: number) {
  if (count <= MAX_INSTALLMENTS_NO_INTEREST) {
    return { installmentCount: count, totalValue: priceCents / 100 };
  }
  return {
    installmentCount: count,
    installmentValue: installmentValueCents(priceCents, count) / 100,
  };
}
