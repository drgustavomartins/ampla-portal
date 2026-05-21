// ─── Helper para gerar checkout links de produtos externos

export type ExternalProductKey = "ampla_ia_12months";
export type ExternalVariant = "full" | "preview";

/**
 * Gera um link de checkout para um produto externo
 * @param productKey - chave do produto (ex: "ampla_ia_12months")
 * @param variant - variante (ex: "full" ou "preview")
 * @returns Promise<string> - URL de checkout no Stripe
 */
export async function getExternalCheckoutUrl(
  productKey: ExternalProductKey,
  variant: ExternalVariant = "full"
): Promise<string> {
  try {
    const response = await fetch("/api/stripe/create-external-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey, variant }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao gerar link de pagamento");
    }

    const data = await response.json();
    return data.url || "";
  } catch (error) {
    console.error("[getExternalCheckoutUrl]", error);
    throw error;
  }
}

/**
 * Redireciona para checkout de um produto externo
 */
export async function redirectToExternalCheckout(
  productKey: ExternalProductKey,
  variant: ExternalVariant = "full"
): Promise<void> {
  try {
    const url = await getExternalCheckoutUrl(productKey, variant);
    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error("[redirectToExternalCheckout]", error);
    alert("Erro ao gerar link de pagamento. Tente novamente.");
  }
}
