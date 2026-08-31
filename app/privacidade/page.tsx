import Link from "next/link";
import type { Metadata } from "next";

// Página pública exigida pela Meta (Privacy Policy URL) e pelo Google
// (verificação OAuth do app — docs/google-verificacao.md). A seção sobre o
// Google Agenda precisa citar os escopos usados e o Uso Limitado.

export const metadata: Metadata = {
  title: "Política de Privacidade | IsoScanning",
  description: "Política de privacidade da plataforma IsoScanning, incluindo o tratamento de dados das integrações com Instagram/Meta e Google Agenda.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Voltar para a IsoScanning</Link>
          <h1 className="text-3xl font-bold mt-4">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Última atualização: 31 de agosto de 2026</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">1. Quem somos</h2>
          <p>
            A <strong>IsoScanning</strong> é uma plataforma que conecta profissionais de fotografia,
            vídeo e social media a projetos e clientes, oferecendo ferramentas de gestão de trabalho,
            equipamentos, finanças e conteúdo para redes sociais. Contato:{" "}
            <a href="mailto:isoscanning@gmail.com" className="text-blue-600 hover:underline">isoscanning@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">2. Dados que coletamos</h2>
          <p>Coletamos e tratamos os seguintes dados, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018):</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, cidade/estado e informações de perfil profissional fornecidas por você.</li>
            <li><strong>Dados de uso:</strong> conteúdos criados na plataforma (cronogramas, posts, relatórios, registros financeiros) e registros técnicos de acesso.</li>
            <li><strong>Dados de pagamento:</strong> processados por parceiros de pagamento; não armazenamos dados completos de cartão.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">3. Integração com Instagram e Meta</h2>
          <p>
            Ao conectar uma conta profissional do Instagram à plataforma (via login da Meta), acessamos,
            mediante sua autorização explícita e exclusivamente para leitura:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Informações básicas do perfil profissional (nome de usuário, id da conta, contagem de seguidores);</li>
            <li>Lista de Páginas do Facebook que você administra e a conta do Instagram vinculada;</li>
            <li>Publicações da conta (legenda, tipo, data, link) e suas métricas (curtidas, comentários, alcance, salvamentos, compartilhamentos, visualizações);</li>
            <li>Dados demográficos agregados e anônimos dos seguidores (faixa etária, gênero, cidade, país), quando disponibilizados pela Meta.</li>
          </ul>
          <p><strong>Como usamos esses dados:</strong> exclusivamente para exibir métricas e relatórios de desempenho ao titular da conta e à equipe autorizada por ele dentro da plataforma, e para gerar sugestões de conteúdo. Não publicamos nada em seu nome, não acessamos mensagens e não vendemos ou compartilhamos esses dados com terceiros.</p>
          <p><strong>Armazenamento:</strong> o token de acesso concedido pela Meta é armazenado de forma protegida em nossos servidores e nunca é exposto no navegador. As métricas sincronizadas ficam associadas ao seu cronograma.</p>
          <p>
            <strong>Revogação:</strong> você pode desconectar a conta a qualquer momento pelo botão
            "Desconectar" na plataforma, ou removendo o app "IsoScanning Social" em
            Facebook → Configurações → Integrações comerciais. Veja também nossa página de{" "}
            <Link href="/exclusao-de-dados" className="text-blue-600 hover:underline">exclusão de dados</Link>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">4. Integração com Google Agenda</h2>
          <p>
            Ao conectar sua conta Google à agenda da plataforma, acessamos, mediante sua autorização
            explícita e apenas nos limites dos escopos concedidos:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Disponibilidade (livre/ocupado):</strong> lemos somente os intervalos de horário em
              que sua agenda principal está ocupada. Não acessamos título, descrição, participantes,
              anexos nem local dos seus eventos.
            </li>
            <li>
              <strong>Calendário criado pelo app:</strong> criamos um calendário secundário chamado
              &quot;IsoScanning&quot; na sua conta e gravamos nele, exclusivamente, os compromissos e
              agendamentos que você gerencia na plataforma. Esse acesso é restrito a calendários criados
              pelo próprio app — seus demais calendários permanecem inacessíveis.
            </li>
            <li>
              <strong>Identificação básica:</strong> e-mail e identificador da conta, usados apenas para
              exibir qual conta está conectada e evitar conexões duplicadas.
            </li>
          </ul>
          <p>
            <strong>Como usamos esses dados:</strong> os intervalos de ocupado servem unicamente para
            marcar datas e horários como indisponíveis no seu perfil público — visitantes veem apenas
            &quot;indisponível&quot;, nunca o motivo. A sincronização ocorre a cada 30 minutos ou quando
            você solicita. Não usamos esses dados para publicidade, não os vendemos e não os
            compartilhamos com terceiros.
          </p>
          <p>
            <strong>Armazenamento:</strong> os tokens de acesso do Google e os intervalos importados são
            armazenados de forma protegida em nossos servidores (tokens cifrados com AES-256-GCM) e nunca
            são expostos no navegador.
          </p>
          <p>
            <strong>Revogação e exclusão:</strong> você pode desconectar a conta a qualquer momento pelo
            botão &quot;Desconectar&quot; na plataforma — isso revoga o acesso junto ao Google, apaga os
            intervalos importados e remove o calendário &quot;IsoScanning&quot; da sua conta. Também é
            possível revogar em{" "}
            <a href="https://myaccount.google.com/permissions" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>.
          </p>
          <p>
            O uso que a IsoScanning faz das informações recebidas das APIs do Google está em conformidade
            com a{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado (Limited Use).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">5. Compartilhamento de dados</h2>
          <p>
            Não vendemos dados pessoais. Compartilhamos dados apenas com operadores necessários ao
            funcionamento do serviço (hospedagem, banco de dados, processamento de pagamento e provedores
            de IA para geração de conteúdo), sempre limitados à finalidade contratada, e quando exigido por lei.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">6. Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar a qualquer momento: confirmação de tratamento, acesso, correção,
            anonimização, portabilidade e exclusão dos seus dados, além da revogação de consentimentos.
            Basta escrever para{" "}
            <a href="mailto:isoscanning@gmail.com" className="text-blue-600 hover:underline">isoscanning@gmail.com</a>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">7. Segurança e retenção</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados (criptografia em trânsito,
            controle de acesso por perfil e políticas de segurança em banco de dados). Os dados são mantidos
            enquanto a conta estiver ativa ou conforme obrigações legais; após a exclusão da conta, são
            removidos ou anonimizados em prazo razoável.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">8. Alterações desta política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas na
            plataforma. O uso continuado após a atualização significa concordância com a nova versão.
          </p>
        </section>
      </div>
    </main>
  );
}
