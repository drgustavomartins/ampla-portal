import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function TermosPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => setLocation("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
      <img src="/logo-icon.png" alt="Ampla Facial" className="w-12 h-12 object-contain mb-6" />
      <h1 className="text-2xl font-semibold text-gold mb-1">Termos de Uso</h1>
      <p className="text-xs text-muted-foreground mb-8">Última atualização: abril de 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-white text-base font-semibold mb-2">1. Identificação do serviço</h2>
          <p>
            A plataforma Ampla Facial Portal ("Plataforma") é operada por <strong className="text-white">Gustavo Martins Martins
            (Dr. Gustavo Martins)</strong>, cirurgião-dentista, CPF/CNPJ disponível mediante solicitação,
            com sede no Rio de Janeiro — RJ, acessível em <a href="https://portal.amplafacial.com.br" className="text-gold underline" target="_blank">portal.amplafacial.com.br</a>.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">2. Objeto</h2>
          <p>
            A Plataforma disponibiliza conteúdo educacional em formato de vídeo-aulas, materiais em PDF, resumos em
            áudio e outros recursos relacionados à Harmonização Orofacial (HOF), destinados exclusivamente a
            profissionais de saúde habilitados para a prática clínica em seu respectivo estado.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">3. Acesso e cadastro</h2>
          <p>
            O acesso à Plataforma requer cadastro com dados verdadeiros. O usuário é responsável pela confidencialidade
            de suas credenciais. O período de teste gratuito é de 7 (sete) dias, sem necessidade de cartão de crédito,
            com acesso limitado às primeiras aulas de cada módulo.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">4. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo disponibilizado — incluindo aulas, materiais, protocolos (entre eles o Método NaturalUp®,
            protocolo registrado) e materiais complementares — é de propriedade exclusiva do Dr. Gustavo Martins.
            É vedada a reprodução, distribuição ou comercialização sem autorização expressa.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">5. Responsabilidade</h2>
          <p>
            O conteúdo tem finalidade educacional e não substitui o julgamento clínico do profissional. O Dr. Gustavo
            Martins não se responsabiliza por procedimentos realizados com base exclusivamente no conteúdo da Plataforma
            sem a devida formação e habilitação profissional.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">6. Cancelamento e rescisão</h2>
          <p>
            O acesso pode ser cancelado a qualquer momento mediante solicitação pelo WhatsApp (21) 97631-0365 ou por
            e-mail. Planos pagos estão sujeitos à política de reembolso vigente na data da contratação.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">7. Contato</h2>
          <p>
            Dúvidas sobre estes termos podem ser enviadas para{" "}
            <a href="mailto:contato@amplafacial.com.br" className="text-gold underline">contato@amplafacial.com.br</a>{" "}
            ou pelo WhatsApp{" "}
            <a href="https://wa.me/5521976310365" className="text-gold underline" target="_blank">(21) 97631-0365</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
