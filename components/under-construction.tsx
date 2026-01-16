"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, Sparkles, Camera, Package } from "lucide-react";

export function UnderConstruction() {
  const [isVisible, setIsVisible] = useState(true);
  const [clicks, setClicks] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);

  const handleClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks === 3) {
      setShowSparkles(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 800);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.8 }}
        className="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950"
      >
        {/* Formas geométricas animadas - Estilo Antigravity */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Círculos flutuantes com cores suaves */}
          <motion.div
            className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, 150, 0],
              y: [0, -80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-indigo-500/20 dark:bg-indigo-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, -120, 0],
              y: [0, 100, 0],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-500/20 dark:bg-cyan-400/10 rounded-full blur-3xl"
            animate={{
              x: [-200, 200, -200],
              y: [-150, 150, -150],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Formas geométricas flutuantes */}
          <motion.div
            className="absolute top-1/4 right-1/3 w-40 h-40 border-2 border-blue-500/30 dark:border-blue-400/20 rounded-3xl"
            animate={{
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/4 w-28 h-28 border-2 border-indigo-500/30 dark:border-indigo-400/20 rounded-2xl"
            animate={{
              rotate: [360, 180, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute top-1/3 left-1/2 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-400/10 dark:to-cyan-400/10 rounded-full"
            animate={{
              y: [0, -30, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-4xl w-full text-center">
            {/* Ícone animado */}
            <motion.div
              className="inline-block mb-8"
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/10 rounded-3xl blur-2xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-blue-200 dark:border-blue-800">
                  <Camera className="w-20 h-20 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
              </div>
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-6"
            >
              Em Breve
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-3xl text-slate-700 dark:text-slate-300 mb-12 font-light"
            >
              Estamos preparando algo incrível para você
            </motion.p>

            {/* Tag "Em Construção" - Easter Egg (clique 3x) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="inline-block"
            >
              <motion.button
                onClick={handleClick}
                className="relative group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-xl group-hover:bg-blue-500/30 dark:group-hover:bg-blue-400/20 transition-all" />
                <div className="relative flex items-center gap-3 px-8 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-full border border-blue-200 dark:border-blue-800 shadow-lg">
                  <Construction className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <span className="text-slate-900 dark:text-white text-lg font-medium">
                    Em Construção
                  </span>
                </div>
              </motion.button>
            </motion.div>

            {/* Sparkles quando desbloqueia */}
            <AnimatePresence>
              {showSparkles && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        x: "50vw",
                        y: "50vh",
                        scale: 0,
                      }}
                      animate={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight,
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1,
                        delay: i * 0.05,
                      }}
                      className="absolute"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <Camera className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4 mx-auto" />
                <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                  Profissionais
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Conecte-se com os melhores fotógrafos
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
                <Package className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4 mx-auto" />
                <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                  Equipamentos
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Alugue ou compre equipamentos profissionais
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800">
                <Sparkles className="w-10 h-10 text-cyan-600 dark:text-cyan-400 mb-4 mx-auto" />
                <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                  Portfólio
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Mostre seu trabalho para o mundo
                </p>
              </div>
            </motion.div>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}

