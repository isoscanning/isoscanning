import Link from "next/link";
import type { Metadata } from "next";

// Página pública exigida pela Meta (Data Deletion Instructions URL) para o
// app de integração com o Instagram operar em modo Live / passar no App Review.

export const metadata: Metadata = {
  title: "Exclusão de Dados | IsoScanning",
  description: "Como solicitar a exclusão dos seus dados na IsoScanning, incluindo dados obtidos via integração com Instagram/Meta.",
};

export default function ExclusaoDeDadosPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Voltar para a IsoScanning</Link>
          <h1 className="text-3xl font-bold mt-4">Exclusão de Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Instruções para remover seus dados da IsoScanning, incluindo os obtidos via Instagram/Meta.
          </p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">1. Desconectar a conta do Instagram</h2>
          <p>Para interromper imediatamente o acesso da plataforma aos dados da sua conta do Instagram:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Pela IsoScanning:</strong> abra o cronograma → botão com o @ da conta →
              <strong> Desconectar conta</strong>. O token de acesso é apagado dos nossos servidores na hora.
            </li>
            <li>
              <strong>Pela Meta:</strong> Facebook → Configurações e privacidade → Configurações →
              <strong> Integrações comerciais</strong> → localizar <strong>"IsoScanning Social"</strong> → Remover.
              Isso invalida o acesso concedido.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">2. Excluir as métricas e conteúdos sincronizados</h2>
          <p>
            Após desconectar, as métricas e posts já sincronizados permanecem no seu cronograma (são parte do
            seu histórico de trabalho). Você pode excluí-los manualmente na plataforma (excluir posts ou o
            cronograma inteiro) ou solicitar a exclusão completa conforme o item 3.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">3. Exclusão completa dos dados / da conta</h2>
          <p>
            Para excluir definitivamente sua conta e todos os dados associados (incluindo qualquer dado obtido
            via integração com a Meta), envie um e-mail para{" "}
            <a href="mailto:isoscanning@gmail.com" className="text-blue-600 hover:underline">isoscanning@gmail.com</a>{" "}
            com o assunto <strong>"Exclusão de dados"</strong>, a partir do e-mail cadastrado na plataforma.
          </p>
          <p>
            Confirmaremos o recebimento em até 72 horas e concluiremos a exclusão em até 30 dias, ressalvados
            os dados cuja manutenção seja exigida por lei (por exemplo, registros fiscais).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">4. Dúvidas</h2>
          <p>
            Consulte também nossa{" "}
            <Link href="/privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>{" "}
            ou fale conosco em{" "}
            <a href="mailto:isoscanning@gmail.com" className="text-blue-600 hover:underline">isoscanning@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
