"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import { Badge } from "./ui/badge";
import { Calculator, DollarSign, Calendar, Image as ImageIcon, FileSignature } from "lucide-react";

import { CalculadoraMockup } from "./mockups/calculadora-mockup";
import { FinanceiroMockup } from "./mockups/financeiro-mockup";
import { AgendaMockup } from "./mockups/agenda-mockup";
import { PortfolioMockup } from "./mockups/portfolio-mockup";
import { ContratosMockup } from "./mockups/contratos-mockup";

const features = [
  {
    id: "calculadora",
    title: "Calculadora de Orçamento",
    description: "Precifique seus trabalhos corretamente considerando equipamentos e custos.",
    icon: Calculator,
    component: CalculadoraMockup,
  },
  {
    id: "financeiro",
    title: "Gestão Financeira (FinMEI)",
    description: "Acompanhe seu fluxo de caixa e limites do MEI em tempo real.",
    icon: DollarSign,
    component: FinanceiroMockup,
  },
  {
    id: "agenda",
    title: "Minha Agenda",
    description: "Disponibilize seus horários e receba agendamentos automaticamente.",
    icon: Calendar,
    component: AgendaMockup,
  },
  {
    id: "portfolio",
    title: "Portfólio",
    description: "Exiba seus melhores trabalhos em uma galeria profissional e ilimitada.",
    icon: ImageIcon,
    component: PortfolioMockup,
  },
  {
    id: "contratos",
    title: "Contratos",
    description: "Crie, envie e acompanhe contratos digitais com assinatura eletrônica.",
    icon: FileSignature,
    component: ContratosMockup,
  },
];

export function InteractiveFeatures() {
  const [activeFeature, setActiveFeature] = useState(features[0].id);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setActiveFeature((current) => {
        const currentIndex = features.findIndex((f) => f.id === current);
        const nextIndex = (currentIndex + 1) % features.length;
        return features[nextIndex].id;
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const activeIndex = features.findIndex((f) => f.id === activeFeature);
  const ActiveComponent = features[activeIndex].component;

  return (
    <section className="min-h-[100vh] h-auto md:min-h-0 md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950 relative overflow-hidden pt-12 pb-20 md:pt-8 md:pb-16 border-t border-white/5">
      <div className="container mx-auto px-4 relative z-10 flex flex-col h-full max-h-none md:max-h-[950px] justify-between md:justify-center">
        {/* Header Title */}
        <ScrollReveal>
          <div className="text-center mb-4 md:mb-6 lg:mb-8 space-y-2 md:space-y-3">
            <Badge className="bg-white/5 text-white/50 border-white/10 px-3 py-0.5 text-[9px] md:text-xs font-semibold tracking-widest uppercase hover:bg-white/10 transition-colors">
              FUNCIONALIDADES
            </Badge>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white max-w-4xl mx-auto leading-tight">
              Tudo que você precisa. Em uma plataforma só.
            </h2>
          </div>
        </ScrollReveal>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-stretch lg:h-[500px] xl:h-[520px] max-w-7xl mx-auto w-full flex-1 lg:flex-none min-h-0">
          {/* Left Menu */}
          <ScrollReveal delay={0.2} direction="right" className="w-full lg:w-80 shrink-0 flex flex-col justify-center">
            <div className="space-y-2">
              {features.map((feature) => {
                const isActive = activeFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => {
                      setActiveFeature(feature.id);
                      setIsAutoPlaying(false); // Stop autoplay on manual click
                    }}
                    className={`w-full text-left px-4 py-2.5 lg:py-3 rounded-xl flex items-center gap-3 transition-all duration-300 relative overflow-hidden group
                      ${isActive 
                        ? 'bg-[#1a1528] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.12)]' 
                        : 'hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    {/* Active Highlight Line */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeFeatureHighlight"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    <feature.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span className={`font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {feature.title}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Description of active feature shown below the menu on desktop */}
            <div className="mt-4 hidden lg:block h-20 shrink-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-lg font-bold text-white">{features[activeIndex].title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{features[activeIndex].description}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollReveal>

          {/* Right Mockup Window */}
          <ScrollReveal delay={0.4} direction="left" className="flex-1 w-full flex flex-col min-h-[450px] lg:min-h-0 relative z-20">
            {/* Mac Window Frame */}
            <div className="flex-1 bg-slate-900 rounded-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative isolate">
              {/* Fake Glow behind window */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 -z-10 blur-2xl pointer-events-none" />
              
              {/* Mac Top Bar */}
              <div className="h-10 bg-slate-800/80 border-b border-white/5 flex items-center px-4 shrink-0">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="flex-1 relative overflow-hidden bg-slate-950">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <div className="w-[118%] h-[118%] origin-top-left scale-[0.85] shrink-0">
                      <ActiveComponent />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
