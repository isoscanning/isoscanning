"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const runTransition = () => {
    const root = window.document.documentElement;
    root.classList.add("theme-transition");
    window.clearTimeout((root as any)._themeTimeout);
    (root as any)._themeTimeout = window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 400);
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full border border-border/60"
        aria-hidden
      />
    );
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-10 w-10 rounded-full border border-border/60 hover:bg-accent/10"
      onClick={() => {
        runTransition();
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Moon className="h-5 w-5 transition-all text-primary" />
      ) : (
        <Sun className="h-5 w-5 transition-all text-primary" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
