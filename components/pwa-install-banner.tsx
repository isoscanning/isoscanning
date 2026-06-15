"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/lib/use-pwa-install";

const DISMISSED_KEY = "pwa_install_dismissed";

// ── iOS step-by-step guide ──────────────────────────────────────────────────

function IOSBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-800 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <Smartphone className="h-4 w-4 text-white/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Instale o ISO Scanning</p>
            <p className="text-xs text-white/50 leading-tight">Adicione à sua tela inicial</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Fechar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold mt-0.5">1</span>
          <div className="flex-1">
            <p className="text-sm text-white/80 leading-snug">
              Toque no botão de{" "}
              <span className="font-semibold text-white">Compartilhar</span>{" "}
              na barra do Safari
            </p>
          </div>
          {/* iOS Share icon replica */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
        </div>

        <div className="h-px bg-white/5 mx-9" />

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold mt-0.5">2</span>
          <div className="flex-1">
            <p className="text-sm text-white/80 leading-snug">
              Role a lista e toque em{" "}
              <span className="font-semibold text-white">"Adicionar à Tela de Início"</span>
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Plus className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        <div className="h-px bg-white/5 mx-9" />

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold mt-0.5">3</span>
          <p className="text-sm text-white/80 leading-snug flex-1">
            Toque em{" "}
            <span className="font-semibold text-white">"Adicionar"</span>{" "}
            no canto superior direito
          </p>
        </div>
      </div>

      {/* Footer note */}
      <div className="px-4 pb-4">
        <p className="text-xs text-white/30 text-center">
          Disponível apenas no Safari — abra este site no Safari para instalar
        </p>
      </div>
    </div>
  );
}

// ── Android / Chrome banner ─────────────────────────────────────────────────

function AndroidBanner({ onInstall, onDismiss, installing }: {
  onInstall: () => void;
  onDismiss: () => void;
  installing: boolean;
}) {
  return (
    <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-800 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Smartphone className="h-5 w-5 text-white/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white leading-tight">Instale o ISO Scanning</p>
          <p className="text-xs text-white/50 leading-tight mt-0.5">Acesse mais rápido direto da sua tela inicial</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={onInstall}
            disabled={installing}
            className="h-8 gap-1.5 bg-white text-black hover:bg-white/90 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            {installing ? "Instalando…" : "Instalar"}
          </Button>
          <button
            onClick={onDismiss}
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

// ── Main export ─────────────────────────────────────────────────────────────

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);
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
    if (outcome === "accepted") handleDismiss();
  };

  if (isInstalled || dismissed) return null;

  // iOS Safari: show manual instruction guide
  if (isIOS) {
    return <IOSBanner onDismiss={handleDismiss} />;
  }

  // Android/Chrome: show one-tap install button
  if (isInstallable) {
    return (
      <AndroidBanner
        onInstall={handleInstall}
        onDismiss={handleDismiss}
        installing={installing}
      />
    );
  }

  return null;
}
