import Link from "next/link";
import type { Metadata } from "next";

// Página pública de Termos de Serviço — referenciada no app da Meta
// (Configurações → Básico → URL dos Termos de Serviço).

export const metadata: Metadata = {
  title: "Termos de Serviço | IsoScanning",
  description: "Termos de serviço da plataforma IsoScanning.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Voltar para a IsoScanning</Link>
          <h1 className="text-3xl font-bold mt-4">Termos de Serviço</h1>
          <p className="text-sm text-muted-foreground mt-1">Última atualização: 10 de julho de 2026</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">1. O serviço</h2>
          <p>
            A <strong>IsoScanning</strong> é uma plataforma que conecta profissionais de fotografia, vídeo e
            social media a projetos e clientes, oferecendo ferramentas de gestão de trabalhos, equipamentos,
            finanças, contratos e conteúdo para redes sociais. Ao criar uma conta, você concorda com estes
            termos e com a nossa{" "}
            <Link href="/privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">2. Conta e responsabilidades</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Você é responsável pelas informações fornecidas no cadastro e pela guarda das suas credenciais.</li>
            <li>É vedado usar a plataforma para atividades ilícitas, publicação de conteúdo ofensivo ou violação de direitos de terceiros.</li>
            <li>Conteúdos criados por você (cronogramas, posts, relatórios, anúncios de equipamentos) são de sua responsabilidade.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">3. Integração com Instagram/Meta</h2>
          <p>
            Ao conectar uma conta profissional do Instagram, você autoriza a IsoScanning a acessar, em modo
            somente leitura, dados de publicações e métricas dessa conta, conforme detalhado na{" "}
            <Link href="/privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>.
            Você declara ser o titular da conta conectada ou possuir autorização do titular para conectá-la.
            A conexão pode ser desfeita a qualquer momento (veja{" "}
            <Link href="/exclusao-de-dados" className="text-blue-600 hover:underline">Exclusão de Dados</Link>).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">4. Conteúdo gerado por IA</h2>
          <p>
            A plataforma oferece geração de conteúdo assistida por inteligência artificial (cronogramas,
            legendas, relatórios). Esses conteúdos são sugestões: revise-os antes de publicar. A IsoScanning
            não se responsabiliza por publicações feitas sem revisão do usuário.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">5. Planos e pagamentos</h2>
          <p>
            Recursos pagos são cobrados conforme o plano contratado, com renovação e cancelamento geridos na
            área de assinatura. O cancelamento interrompe as cobranças futuras e mantém o acesso até o fim do
            período já pago.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">6. Limitação de responsabilidade</h2>
          <p>
            A plataforma é fornecida "como está". Empregamos esforços razoáveis para manter o serviço
            disponível e seguro, mas não garantimos operação ininterrupta nem nos responsabilizamos por
            indisponibilidades de serviços de terceiros (ex.: APIs da Meta) ou por lucros cessantes.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">7. Alterações e contato</h2>
          <p>
            Estes termos podem ser atualizados; mudanças relevantes serão comunicadas na plataforma. Dúvidas:{" "}
            <a href="mailto:isoscanning@gmail.com" className="text-blue-600 hover:underline">isoscanning@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
