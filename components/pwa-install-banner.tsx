"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/lib/use-pwa-install";

const DISMISSED_KEY = "pwa_install_dismissed";

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await install();
    setInstalling(false);
    if (outcome === "accepted") {
      handleDismiss();
    }
  };

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="mx-4 mt-4 mb-0 rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Smartphone className="h-5 w-5 text-white/70" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white leading-tight">
            Instale o ISO Scanning
          </p>
          <p className="text-xs text-white/50 leading-tight mt-0.5">
            Acesse mais rápido direto da sua tela inicial
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={installing}
            className="h-8 gap-1.5 bg-white text-black hover:bg-white/90 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            {installing ? "Instalando…" : "Instalar"}
          </Button>

          <button
            onClick={handleDismiss}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
