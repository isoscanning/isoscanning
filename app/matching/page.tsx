"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Check, MapPin, Sparkles, Building2, Globe2, Briefcase, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CARDS = [
  { 
    id: 1, 
    type: 'single', 
    title: 'Vamos conhecer sua trajetória profissional', 
    text: 'O mercado audiovisual está passando por uma grande transformação. Novos projetos surgem todos os dias, mas encontrar os profissionais certos continua sendo um dos maiores desafios para empresas e contratantes.\n\nNossa missão é conectar profissionais qualificados às oportunidades que realmente fazem sentido para seu perfil.\n\nPara começar, qual é o seu tempo de experiência na área?', 
    question: 'Qual é o seu tempo de experiência profissional?', 
    options: ['Menos de 1 ano', 'Entre 1 e 2 anos', 'Entre 3 e 5 anos', 'Mais de 6 anos'], 
    field: 'experience' 
  },
  { 
    id: 2, 
    type: 'info', 
    title: 'Excelente!', 
    text: 'Obrigado por compartilhar sua experiência conosco.\n\nProfissionais com seu nível de experiência estão entre os perfis mais procurados pelas empresas que utilizam nossa plataforma. Muitas delas estão terceirizando projetos internos e reservando orçamento para contratar especialistas experientes.\n\nEstamos felizes por ter você aqui.\n\nFaltam apenas algumas etapas para encontrarmos as oportunidades mais alinhadas ao seu perfil.' 
  },
  { 
    id: 3, 
    type: 'info', 
    title: 'Você faz parte de um mercado em crescimento', 
    text: 'Centenas de profissionais já utilizam nossa plataforma para encontrar novos projetos, ampliar sua rede de contatos e gerar novas oportunidades de trabalho.\n\nNosso objetivo é fortalecer e movimentar o mercado audiovisual, conectando talentos a empresas, agências, produtoras e clientes que precisam exatamente das habilidades que você possui.\n\nVamos continuar.' 
  },
  { 
    id: 4, 
    type: 'single', 
    title: 'Quais são seus objetivos financeiros?', 
    text: 'Entender suas expectativas nos ajuda a encontrar projetos compatíveis com seus objetivos profissionais.', 
    question: 'Quanto você gostaria de gerar em novos projetos?', 
    options: ['A partir de R$ 2.000', 'A partir de R$ 5.000', 'A partir de R$ 10.000', 'Acima de R$ 20.000'], 
    field: 'financialGoal' 
  },
  { 
    id: 5, 
    type: 'info', 
    title: 'Obrigado pela transparência', 
    text: 'Sua resposta nos ajuda a direcionar oportunidades mais compatíveis com suas expectativas.\n\nAgora vamos entender melhor seu perfil profissional, sua forma de trabalho e suas preferências para aumentar as chances de encontrar projetos alinhados aos seus objetivos.' 
  },
  { 
    id: 6, 
    type: 'single', 
    title: 'Como você prefere trabalhar?', 
    question: 'Qual formato de trabalho você procura atualmente?', 
    options: ['100% Remoto', 'Presencial', 'Híbrido'], 
    field: 'workFormat' 
  },
  { 
    id: 7, 
    type: 'single', 
    title: 'O que você mais valoriza no trabalho remoto?', 
    question: 'Qual destes fatores é mais importante para você?', 
    options: ['Não precisar de deslocamento', 'Horários flexíveis', 'Mais oportunidades em diferentes mercados', 'Trabalhar de qualquer lugar'], 
    field: 'remoteValue',
    dependsOn: { field: 'workFormat', value: ['100% Remoto', 'Híbrido'] } // We can skip if Presencial, but let's just show it always or skip if needed. The spec didn't specify skip.
  },
  { 
    id: 8, 
    type: 'location', 
    title: 'Onde você está atualmente?', 
    field: 'location' 
  },
  { 
    id: 9, 
    type: 'single', 
    title: 'Quanto tempo você pode dedicar aos projetos?', 
    question: 'Qual é sua disponibilidade semanal?', 
    options: ['Menos de 2 horas', 'Entre 2 e 4 horas', 'Entre 4 e 8 horas', 'Mais de 8 horas'], 
    field: 'availability' 
  },
  { 
    id: 10, 
    type: 'info', 
    title: 'Ótimo!', 
    text: 'Disponibilidade é um dos fatores mais importantes para conectar profissionais às oportunidades certas.\n\nQuanto mais clareza tivermos sobre sua agenda, maior será nossa capacidade de apresentar projetos alinhados ao seu momento profissional.' 
  },
  { 
    id: 11, 
    type: 'multi', 
    title: 'Em quais áreas você atua?', 
    text: 'Selecione uma ou mais opções.', 
    options: ['Cinegrafista', 'Videomaker', 'Editor de Vídeos', 'Editor de Fotos', 'Fotógrafo', 'Fotógrafo de Eventos', 'Fotógrafo de Retrato', 'Fotógrafo de Produtos', 'Piloto de Drone', 'Piloto de Drone FPV', 'Social Media', 'Storymaker', 'Produtor Audiovisual'], 
    field: 'specialties' 
  },
  { 
    id: 12, 
    type: 'single', 
    title: 'Qual é seu nível profissional atual?', 
    options: ['Iniciante', 'Júnior (até 2 anos)', 'Pleno (2 a 5 anos)', 'Sênior (mais de 5 anos)', 'Liderança / Gestão'], 
    field: 'professionalLevel' 
  },
  { 
    id: 13, 
    type: 'single', 
    title: 'Flexibilidade profissional', 
    question: 'Você consideraria atuar em um cargo abaixo do seu nível atual?', 
    options: ['Sim, se necessário', 'Talvez, dependendo da oportunidade', 'Não, apenas cargos equivalentes ou superiores'], 
    field: 'flexibility' 
  },
  { 
    id: 14, 
    type: 'info', 
    title: 'Boa escolha', 
    text: 'Profissionais que mantêm certa flexibilidade costumam ter acesso a uma quantidade maior de oportunidades e conseguem acelerar sua entrada em novos projetos.\n\nEssa informação será considerada em nossas recomendações.' 
  },
  { 
    id: 15, 
    type: 'single', 
    title: 'Quando foi sua última atuação profissional?', 
    question: 'Quando você trabalhou pela última vez em uma função relacionada às áreas selecionadas?', 
    options: ['Atualmente estou trabalhando', 'Nos últimos 30 dias', 'Entre 1 e 6 meses', 'Entre 6 meses e 1 ano', 'Entre 1 e 3 anos', 'Mais de 3 anos'], 
    field: 'recentExperience' 
  },
  { 
    id: 16, 
    type: 'info', 
    title: 'Seu perfil está quase concluído', 
    text: 'Excelente.\n\nCom base nas informações compartilhadas até aqui, já conseguimos identificar diversas oportunidades potencialmente compatíveis com seu perfil.\n\nAs empresas cadastradas em nossa plataforma procuram constantemente profissionais com habilidades técnicas, disponibilidade e experiência semelhantes às suas.\n\nVamos concluir as últimas etapas.' 
  },
  { 
    id: 17, 
    type: 'single', 
    title: 'Dias disponíveis', 
    question: 'Quais dias funcionam melhor para você?', 
    options: ['Qualquer dia da semana', 'Apenas dias úteis', 'Apenas finais de semana', 'Horários a combinar'], 
    field: 'availableDays' 
  },
  { 
    id: 18, 
    type: 'single', 
    title: 'Como você prefere trabalhar?', 
    question: 'Qual tamanho de equipe combina mais com você?', 
    options: ['Trabalho melhor sozinho', 'Pequenas equipes', 'Equipes médias ou grandes', 'Não faz diferença'], 
    field: 'teamSize' 
  },
  { 
    id: 19, 
    type: 'single', 
    title: 'Ambiente de trabalho ideal', 
    question: 'Qual tipo de oportunidade combina mais com você?', 
    options: ['Grandes empresas', 'Pequenas empresas', 'Agências', 'Produtoras', 'Trabalho direto com clientes', 'Não tenho preferência'], 
    field: 'idealEnvironment' 
  },
  { 
    id: 20, 
    type: 'single', 
    title: 'Preferências de contratação', 
    question: 'Como você prefere receber pelos projetos?', 
    options: ['Pagamento antecipado', 'Pagamento por etapas', 'Pagamento na entrega', 'Não tenho preferência'], 
    field: 'paymentForm' 
  },
  { 
    id: 21, 
    type: 'single', 
    title: 'Oportunidades internacionais', 
    question: 'Como você se sente sobre trabalhar remotamente para clientes de qualquer lugar do mundo?', 
    options: ['Gosto muito', 'Acho interessante', 'Tanto faz', 'Prefiro atuar localmente'], 
    field: 'internationalProjects' 
  },
  { 
    id: 22, 
    type: 'single', 
    title: 'Modelo de oportunidades', 
    question: 'Até que ponto isso combina com você?\n\nNossa plataforma busca conectar empresas ao seu perfil para que oportunidades relevantes encontrem você.', 
    options: ['Muito positivo', 'Positivo', 'Tanto faz', 'Não considero importante'], 
    field: 'opportunitiesModel' 
  },
  { 
    id: 23, 
    type: 'finish', 
    title: 'Tudo pronto!', 
    text: 'Seu perfil possui características procuradas por empresas, agências, produtoras e contratantes que utilizam nossa plataforma diariamente.\n\nO próximo passo é criar sua conta e completar seu portfólio profissional.\n\nQuanto mais completo estiver seu perfil, maiores serão suas chances de ser encontrado para projetos alinhados à sua experiência, disponibilidade e objetivos.\n\nClique em "Continuar" para acessar a plataforma e finalizar seu cadastro.' 
  }
];

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function MatchingPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentCard = CARDS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === CARDS.length - 1;

  const handleNext = () => {
    // Validation
    if (currentCard.type === 'single' && !answers[currentCard.field!]) {
      return;
    }
    if (currentCard.type === 'multi' && (!answers[currentCard.field!] || answers[currentCard.field!].length === 0)) {
      return;
    }
    if (currentCard.type === 'location') {
      if (!answers['country'] || !answers['state']) {
        return;
      }
    }

    if (currentStepIndex < CARDS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError("");

    try {
      localStorage.setItem("onboardingData", JSON.stringify(answers));
      localStorage.setItem("redirectAfterLogin", "/dashboard/perfil?onboarding=true");
      
      await signInWithGoogle({
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
          consent: "prompt"
        }
      });
    } catch (err: any) {
      setError(err.message || "Erro ao conectar-se com o Google.");
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (currentCard.type) {
      case 'info':
      case 'finish':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">{currentCard.title}</h2>
            {currentCard.text && (
              <div className="text-slate-600 text-base md:text-lg leading-relaxed space-y-4 text-center">
                {currentCard.text.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
        );

      case 'single':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-2">{currentCard.title}</h2>
            {currentCard.text && (
              <p className="text-slate-600 text-center mb-6">{currentCard.text}</p>
            )}
            {currentCard.question && (
              <h3 className="text-xl font-medium text-slate-900 text-center mb-6">{currentCard.question}</h3>
            )}
            
            <div className="grid gap-3 max-w-md mx-auto">
              {currentCard.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setAnswers(prev => ({ ...prev, [currentCard.field!]: option }));
                    setTimeout(handleNext, 300);
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group ${
                    answers[currentCard.field!] === option
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  <span className={`font-medium ${answers[currentCard.field!] === option ? "text-primary" : "text-slate-700"}`}>
                    {option}
                  </span>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    answers[currentCard.field!] === option
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 group-hover:border-primary/50"
                  }`}>
                    {answers[currentCard.field!] === option && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'multi':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-2">{currentCard.title}</h2>
            {currentCard.text && (
              <p className="text-slate-600 text-center mb-6">{currentCard.text}</p>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {currentCard.options?.map((option) => {
                const selected = answers[currentCard.field!]?.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      const current = answers[currentCard.field!] || [];
                      const newSelected = selected
                        ? current.filter((i: string) => i !== option)
                        : [...current, option];
                      setAnswers(prev => ({ ...prev, [currentCard.field!]: newSelected }));
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between group ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <span className={`font-medium ${selected ? "text-primary" : "text-slate-700"}`}>
                      {option}
                    </span>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30 group-hover:border-primary/50"
                    }`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">{currentCard.title}</h2>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">País</label>
                <select
                  value={answers.country || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full p-3.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option value="" disabled>Selecione seu país</option>
                  <option value="Brasil">Brasil</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {answers.country === 'Brasil' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Estado</label>
                  <select
                    value={answers.state || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full p-3.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="" disabled>Selecione seu estado</option>
                    {ESTADOS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (currentCard.type === 'single') return !answers[currentCard.field!];
    if (currentCard.type === 'multi') return !answers[currentCard.field!] || answers[currentCard.field!].length === 0;
    if (currentCard.type === 'location') return !answers.country || (answers.country === 'Brasil' && !answers.state);
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="w-full bg-white border-b border-border/40 py-4 sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 flex flex-col items-center justify-center gap-1">
          <Image
            src="/logo-cortada.png"
            alt="ISO Scanning"
            width={160}
            height={28}
            className="h-7 w-auto drop-shadow-sm"
            priority
          />
          <p className="text-xs font-medium text-primary/80 uppercase tracking-wider">
            Onde a criatividade encontra oportunidade
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8 md:py-12 flex flex-col">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStepIndex + 1) / CARDS.length) * 100}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="relative">
            <div
              key={currentStepIndex}
              className="bg-white p-6 md:p-10 rounded-3xl shadow-xl shadow-blue-900/5 border border-border/50 animate-in fade-in slide-in-from-right-4 duration-500"
            >
              {renderContent()}

              {error && (
                <div className="mt-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-10 flex items-center justify-between gap-4 pt-6 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isFirstStep || loading}
                  className={isFirstStep ? "invisible" : ""}
                >
                  Voltar
                </Button>
                
                {isLastStep ? (
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-primary hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
                    onClick={handleFinish}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando conta...
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-1 rounded-full mr-1">
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                        Criar Minha Conta com Google
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleNext}
                    disabled={isNextDisabled()}
                    className="min-w-[120px] gap-2"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
