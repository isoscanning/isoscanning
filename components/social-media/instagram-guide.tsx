"use client";

import { useState } from "react";
import { ChevronDown, Smartphone, Facebook, Link2, UserCheck, MousePointerClick, AlertTriangle } from "lucide-react";

// Guia passo a passo exibido no modal "Conectar Instagram" — escrito para o
// usuário leigo (dono do negócio) conseguir preparar a conta sozinho.

interface GuideStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  details: React.ReactNode;
}

const STEPS: GuideStep[] = [
  {
    icon: Smartphone,
    title: "1. Torne o Instagram uma conta profissional",
    summary: "Comercial ou Criador de Conteúdo — é grátis e reversível.",
    details: (
      <ol className="list-decimal list-inside space-y-1">
        <li>Abra o app do <strong>Instagram</strong> e vá no seu perfil</li>
        <li>Menu (☰) → <strong>Configurações e privacidade</strong></li>
        <li><strong>Tipo de conta e ferramentas</strong> → <strong>Mudar para conta profissional</strong></li>
        <li>Escolha <strong>Empresa</strong> (ou Criador de Conteúdo) e conclua</li>
      </ol>
    ),
  },
  {
    icon: Facebook,
    title: "2. Tenha uma Página do Facebook da marca",
    summary: "Não é o perfil pessoal — é uma Página. Se já tem, pule.",
    details: (
      <ol className="list-decimal list-inside space-y-1">
        <li>Acesse <strong>facebook.com/pages/create</strong> (ou app do Facebook → Menu → Páginas → Criar)</li>
        <li>Preencha só o básico: nome da marca e categoria</li>
        <li>Pronto — a Página não precisa ter posts nem seguidores para a conexão funcionar</li>
      </ol>
    ),
  },
  {
    icon: Link2,
    title: "3. Vincule o Instagram à Página",
    summary: "O passo mais importante — e o mais esquecido.",
    details: (
      <div className="space-y-2">
        <p className="font-medium">Pelo computador (recomendado):</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Facebook → abra a sua <strong>Página</strong></li>
          <li><strong>Configurações</strong> → <strong>Contas vinculadas</strong></li>
          <li><strong>Instagram</strong> → <strong>Conectar conta</strong> → faça login no Instagram da marca</li>
        </ol>
        <p className="font-medium pt-1">Ou pelo app do Instagram:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Perfil → <strong>Editar perfil</strong> → <strong>Página</strong> → selecione a Página</li>
        </ol>
        <p className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400 pt-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Atenção: adicionar o Instagram na <strong>Central de Contas</strong> NÃO substitui este passo — o vínculo precisa ser com a Página.</span>
        </p>
      </div>
    ),
  },
  {
    icon: UserCheck,
    title: "4. Quem conecta precisa administrar a Página",
    summary: "Use o Facebook do dono da Página (ou seja adicionado como admin).",
    details: (
      <div className="space-y-1.5">
        <p>Na tela de login da Meta, entre com a conta do Facebook que é <strong>administradora da Página</strong>. Duas formas de garantir isso:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>O próprio dono do negócio faz o login na hora de conectar; ou</li>
          <li>Ele te adiciona como admin: Página → <strong>Configurações</strong> → <strong>Acesso à Página</strong> → Adicionar</li>
        </ol>
      </div>
    ),
  },
  {
    icon: MousePointerClick,
    title: "5. Conecte e marque a Página + o Instagram",
    summary: "Nas telas da Meta, selecione os dois ativos — não pule as seleções.",
    details: (
      <ol className="list-decimal list-inside space-y-1">
        <li>Clique no botão azul <strong>"Conectar com Facebook"</strong> abaixo</li>
        <li>Faça login na Meta (não temos acesso à sua senha)</li>
        <li>Quando perguntar <strong>quais Páginas</strong> o app pode acessar → marque a Página da marca</li>
        <li>Quando perguntar <strong>quais contas do Instagram</strong> → marque a conta da marca</li>
        <li>Revise e clique em <strong>Salvar</strong> — você voltará automaticamente para cá</li>
      </ol>
    ),
  },
];

export function InstagramConnectGuide() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium leading-tight">{step.title}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 leading-tight">{step.summary}</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pl-[52px] text-xs text-muted-foreground leading-relaxed">
                {step.details}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground pt-1">
        💡 Deu erro de "nenhuma conta vinculada"? Quase sempre é o passo 3 — refaça o vínculo do
        Instagram com a Página e conecte novamente.
      </p>
    </div>
  );
}
