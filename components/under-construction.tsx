"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction, Sparkles, Camera, Package } from "lucide-react";

export function UnderConstruction() {
  const [isVisible, setIsVisible] = useState(true);
  const [clicks, setClicks] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    // Verificar se já desbloqueou antes
    const unlocked = localStorage.getItem("site_unlocked");
    if (unlocked === "true") {
      setIsVisible(false);
    }
  }, []);

  const handleClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (newClicks === 3) {
      setShowSparkles(true);
      setTimeout(() => {
        localStorage.setItem("site_unlocked", "true");
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
        className="fixed inset-0 z-[9999] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)",
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite",
        }}
      >
        {/* Formas geométricas animadas */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Círculos flutuantes */}
          <motion.div
            className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, 80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-72 h-72 bg-white/10 rounded-full blur-3xl"
            animate={{
              x: [-150, 150, -150],
              y: [-100, 100, -100],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Formas geométricas */}
          <motion.div
            className="absolute top-1/4 right-1/4 w-32 h-32 border-4 border-white/20 rounded-2xl"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/3 w-24 h-24 border-4 border-white/20"
            animate={{
              rotate: [360, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
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
                  className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <div className="relative bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20">
                  <Camera className="w-20 h-20 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </motion.div>

            {/* Título */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-8xl font-bold text-white mb-6"
              style={{
                textShadow: "0 4px 30px rgba(0,0,0,0.2)",
              }}
            >
              Em Breve
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-3xl text-white/90 mb-12 font-light"
            >
              Estamos preparando algo incrível para você
            </motion.p>

            {/* Tag "Em Construção" - Easter Egg */}
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
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all" />
                <div className="relative flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                  <Construction className="w-6 h-6 text-white" />
                  <span className="text-white text-lg font-medium">
                    Em Construção
                  </span>
                  {clicks > 0 && clicks < 3 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white text-purple-600 rounded-full flex items-center justify-center text-xs font-bold"
                    >
                      {clicks}
                    </motion.span>
                  )}
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
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <Camera className="w-10 h-10 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  Profissionais
                </h3>
                <p className="text-white/70 text-sm">
                  Conecte-se com os melhores fotógrafos
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <Package className="w-10 h-10 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  Equipamentos
                </h3>
                <p className="text-white/70 text-sm">
                  Alugue ou compre equipamentos profissionais
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <Sparkles className="w-10 h-10 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  Portfólio
                </h3>
                <p className="text-white/70 text-sm">
                  Mostre seu trabalho para o mundo
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Gradiente animado CSS */}
        <style jsx>{`
          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

