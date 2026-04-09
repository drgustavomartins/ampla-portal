import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

export default function PrivacidadePage() {
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
      <h1 className="text-2xl font-semibold text-gold mb-1">Política de Privacidade</h1>
      <p className="text-xs text-muted-foreground mb-8">Última atualização: abril de 2026 · Versão 1.0</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-white text-base font-semibold mb-2">1. Controlador dos dados</h2>
          <p>
            <strong className="text-white">Dr. Gustavo Martins</strong> (Gustavo Martins Martins), cirurgião-dentista,
            é o controlador dos dados pessoais coletados nesta Plataforma, nos termos da Lei nº 13.709/2018 (LGPD).
            Contato do DPO: <a href="mailto:contato@amplafacial.com.br" className="text-gold underline">contato@amplafacial.com.br</a>.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">2. Dados coletados</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-white">Dados de cadastro:</strong> nome completo, e-mail e telefone (opcional).</li>
            <li><strong className="text-white">Dados de uso:</strong> progresso nas aulas, data e hora de acesso.</li>
            <li><strong className="text-white">Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">3. Finalidade e base legal</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-white/60 font-medium">Finalidade</th>
                <th className="text-left py-2 text-white/60 font-medium">Base legal (LGPD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr><td className="py-2">Acesso à Plataforma</td><td className="py-2">Execução de contrato (Art. 7, V)</td></tr>
              <tr><td className="py-2">Comunicações sobre o serviço</td><td className="py-2">Consentimento (Art. 7, I)</td></tr>
              <tr><td className="py-2">Segurança e prevenção a fraudes</td><td className="py-2">Interesse legítimo (Art. 7, IX)</td></tr>
              <tr><td className="py-2">Cumprimento de obrigações legais</td><td className="py-2">Obrigação legal (Art. 7, II)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">4. Compartilhamento de dados</h2>
          <p>
            Os dados não são vendidos a terceiros. Podem ser compartilhados apenas com prestadores de serviço
            essenciais ao funcionamento da Plataforma (serviços de e-mail, hospedagem), mediante acordos de
            confidencialidade.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">5. Retenção de dados</h2>
          <p>
            Os dados são mantidos enquanto o usuário possuir uma conta ativa. Após o encerramento, são retidos pelo
            prazo mínimo exigido por obrigações legais (até 5 anos para fins fiscais) e excluídos em seguida.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">6. Direitos do titular</h2>
          <p className="mb-2">
            Nos termos do Art. 18 da LGPD, você pode a qualquer momento:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Acessar, corrigir ou portar seus dados</li>
            <li>Solicitar anonimização, bloqueio ou eliminação dos dados</li>
            <li>Revogar o consentimento</li>
          </ul>
          <p className="mt-2">
            Solicitações podem ser feitas pelo e-mail{" "}
            <a href="mailto:contato@amplafacial.com.br" className="text-gold underline">contato@amplafacial.com.br</a>.
            O prazo de resposta é de 15 dias úteis.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">7. Cookies</h2>
          <p>
            A Plataforma utiliza um cookie de sessão (<code className="text-gold text-xs">ampla_token</code>) estritamente
            necessário para manter o usuário autenticado. Nenhum cookie de rastreamento ou publicidade é utilizado.
          </p>
        </section>

        <section>
          <h2 className="text-white text-base font-semibold mb-2">8. Alterações nesta Política</h2>
          <p>
            Esta política pode ser atualizada a qualquer momento. Alterações relevantes serão comunicadas por e-mail.
            A versão atual está sempre disponível em{" "}
            <a href="https://portal.amplafacial.com.br/#/privacidade" className="text-gold underline">portal.amplafacial.com.br/#/privacidade</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
