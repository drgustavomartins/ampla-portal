// ─── Configuração de Produtos Externos (não gerenciados pelo sistema de planos interno)
// Usado para produtos como Ampla IA que têm checkout separado

export type ExternalProductKey = "ampla_ia_12months";
export type ExternalVariant = "full" | "preview";

export interface ExternalProductVariant {
  price: number; // em centavos
  description: string; // descrição para o Stripe
  label?: string; // label visual para link de checkout
}

export interface ExternalProductConfig {
  name: string; // nome do produto no Stripe
  description: string; // descrição do produto
  variants: Record<ExternalVariant, ExternalProductVariant>;
}

export const EXTERNAL_PRODUCTS: Record<ExternalProductKey, ExternalProductConfig> = {
  ampla_ia_12months: {
    name: "Ampla IA — Formação prática de IA para saúde",
    description: "Curso premium com 12 meses de acesso · Prompts seguros · Gestão e automação clínica · Marketing com IA · Conformidade LGPD",
    variants: {
      full: {
        price: 42700, // R$ 427,00 em centavos
        description: "Acesso 12 meses — Pagamento único",
        label: "Acesso Completo",
      },
      preview: {
        price: 29800, // R$ 298,00 em centavos (pré-venda)
        description: "Pré-venda 12 meses — Pagamento único",
        label: "Pré-venda",
      },
    },
  },
};

/**
 * Gera uma URL de checkout para um produto externo
 * @param productKey - chave do produto (ex: "ampla_ia_12months")
 * @param variant - variante do produto (ex: "full" ou "preview")
 * @param baseUrl - URL base da aplicação
 * @returns Promise<string> - URL de checkout
 */
export async function generateExternalCheckoutUrl(
  productKey: ExternalProductKey,
  variant: ExternalVariant = "full",
  baseUrl: string = process.env.APP_URL || "https://ia-ampla.com.br"
): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/stripe/create-external-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey, variant }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao gerar checkout: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url || "";
  } catch (error) {
    console.error("[generateExternalCheckoutUrl]", error);
    throw error;
  }
}

/**
 * Retorna informações sobre um produto externo
 */
export function getExternalProduct(productKey: ExternalProductKey) {
  return EXTERNAL_PRODUCTS[productKey];
}

/**
 * Retorna informações sobre uma variante específica
 */
export function getExternalVariant(productKey: ExternalProductKey, variant: ExternalVariant) {
  const product = EXTERNAL_PRODUCTS[productKey];
  return product?.variants[variant];
}
