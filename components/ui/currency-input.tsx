"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { currencyToNumber, formatCurrencyDigits, formatPlain } from "@/lib/finances/money";

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | null;
  onValueChange: (value: number | null) => void;
}

/**
 * Campo de dinheiro em pt-BR com máscara de centavos: o usuário digita os
 * dígitos e vê "1.500,50". Aceita colar "1.500,50", "R$ 1.500" ou "1500.50".
 * Emite o número (não a string) em `onValueChange`.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onValueChange, className, placeholder = "0,00", ...rest },
  ref
) {
  const [text, setText] = React.useState(() => (value == null ? "" : formatPlain(value)));

  // Sincroniza quando o valor muda por fora (abrir o modal para editar, duplicar…)
  React.useEffect(() => {
    const current = currencyToNumber(text);
    if ((value ?? null) !== (current ?? null)) {
      setText(value == null ? "" : formatPlain(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        R$
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="pl-10 tabular-nums"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
          setText(digits ? formatCurrencyDigits(digits) : "");
          onValueChange(digits ? parseInt(digits, 10) / 100 : null);
        }}
        {...rest}
      />
    </div>
  );
});
