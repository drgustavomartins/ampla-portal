import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadStripe, type Stripe as StripeInstance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, ShieldCheck, Lock, Calendar } from "lucide-react";

function CardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/#/trial/cartao-confirmado`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Erro ao validar cartão");
      setSubmitting(false);
      return;
    }

    // Salva o payment_method no backend
    const pm = (setupIntent as any)?.payment_method;
    if (!pm) {
      setError("Não foi possível obter o cartão. Tente novamente.");
      setSubmitting(false);
      return;
    }

    try {
      const resp = await apiRequest("POST", "/api/trial/confirm-card", {
        paymentMethodId: pm,
        planKey: "acesso_vitalicio",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao salvar cartão");
      onSuccess();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-xl py-3.5 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
        style={{ background: "linear-gradient(135deg, #D4A843 0%, #E8C86A 100%)", color: "#0A0D14" }}
      >
        {submitting ? "Validando..." : "Liberar 7 dias gratuitos"}
      </button>
      <p className="text-center text-[11px] text-white/40 leading-relaxed">
        Pagamento processado com segurança pela Stripe.
        <br />
        Você só será cobrado em 7 dias. Cancele antes a qualquer momento.
      </p>
    </form>
  );
}

export default function TrialCartao() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<StripeInstance | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    if ((user as any).planKey) {
      // Já tem plano, não precisa de trial
      navigate("/");
      return;
    }

    // Busca chave pública + cria SetupIntent em paralelo
    Promise.all([
      fetch("/api/stripe/public-key").then(r => r.json()),
      apiRequest("POST", "/api/trial/setup-intent", {}).then(r => r.json()),
    ])
      .then(([keyData, setupData]) => {
        if (!keyData.publishableKey) throw new Error("Chave pública do Stripe não configurada");
        if (setupData.error) throw new Error(setupData.error);
        setStripePromise(loadStripe(keyData.publishableKey));
        setClientSecret(setupData.clientSecret);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [user]);

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] p-6">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso liberado!</h1>
          <p className="text-white/60 mb-6">
            Aproveite os 7 dias gratuitos da plataforma. Em caso de dúvidas, o Dr. Gustavo está disponível pelo canal direto.
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl px-6 py-3 font-semibold"
            style={{ background: "#D4A843", color: "#0A0D14" }}
          >
            Acessar a plataforma
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] py-8 px-5">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Cadastre seu cartão</h1>
          <p className="text-white/60 text-sm">
            Você terá <strong className="text-white">7 dias gratuitos</strong> para conhecer a plataforma.
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 mb-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-[#D4A843] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-white font-medium mb-1">Como funciona o trial</p>
              <ul className="text-white/60 space-y-1 text-[13px]">
                <li>• Acesso completo por 7 dias</li>
                <li>• No 5º dia você recebe um email de aviso</li>
                <li>• No 7º dia cobramos R$ 397 (Plataforma Online)</li>
                <li>• Cancele antes do 7º dia para não ser cobrado</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6">
          {loading && (
            <div className="text-center text-gray-500 py-8">Carregando...</div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {clientSecret && stripePromise && !error && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
              <CardForm onSuccess={() => setDone(true)} />
            </Elements>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Stripe</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Cancelamento livre</span>
        </div>
      </div>
    </div>
  );
}
