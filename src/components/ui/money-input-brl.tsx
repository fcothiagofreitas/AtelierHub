"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function reaisToDigits(reais: number | null | undefined): string {
  if (reais == null || !Number.isFinite(reais) || reais < 0) return "";
  return String(Math.round(reais * 100));
}

function digitsToReaisString(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return "";
  return (n / 100).toString();
}

function formatBrlFromDigits(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const MAX_DIGITS = 15;

type MoneyInputBrlProps = {
  id: string;
  name: string;
  /** Valor em reais (ex.: vindo do Prisma.Decimal) — null = vazio / ilimitado */
  defaultReais: number | null;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
};

/**
 * Campo monetário BRL: digitação como centavos à direita (comum em maquininhas).
 * Envia string numérica no hidden (ex. "1500.50"); vazio = sem limite.
 */
export function MoneyInputBrl({
  id,
  name,
  defaultReais,
  placeholder = "Ilimitado",
  invalid,
  className,
}: MoneyInputBrlProps) {
  const initialDigits = useMemo(
    () => reaisToDigits(defaultReais ?? null),
    [defaultReais],
  );

  const [digits, setDigits] = useState(initialDigits);

  const display = digits === "" ? "" : formatBrlFromDigits(digits);
  const hiddenValue = digits === "" ? "" : digitsToReaisString(digits);

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-10 text-base transition-colors outline-none md:text-sm",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "placeholder:text-muted-foreground",
          invalid && "border-destructive",
        )}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
          setDigits(d);
        }}
      />
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
        aria-hidden
      >
        R$
      </span>
      <input type="hidden" name={name} value={hiddenValue} />
    </div>
  );
}
