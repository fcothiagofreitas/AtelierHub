"use client";

import { Button } from "@/components/ui/button";

/** Alinhado ao `prisma/seed.ts` — só para `next dev`. */
const DEV_LOGINS = [
  { label: "Admin da marca", email: "admin@demo.com", password: "admin123" },
  { label: "Gerente", email: "gerente@demo.com", password: "gerente123" },
  { label: "Vendedor", email: "vendedor@demo.com", password: "vendedor123" },
] as const;

type DevLoginShortcutsProps = {
  onPick: (email: string, password: string) => void;
};

export function DevLoginShortcuts({ onPick }: DevLoginShortcutsProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50/80 p-4 shadow-sm dark:border-amber-600/40 dark:bg-amber-950/30">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
        Ambiente de desenvolvimento
      </p>
      <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
        Preencher e-mail e senha do seed (clique e depois em Entrar).
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {DEV_LOGINS.map((row) => (
          <Button
            key={row.email}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto w-full flex-col items-stretch gap-0.5 border-amber-200/80 bg-background/80 py-2 text-left hover:bg-amber-100/50 dark:border-amber-800 dark:hover:bg-amber-900/40"
            title={`Senha: ${row.password}`}
            onClick={() => onPick(row.email, row.password)}
          >
            <span className="text-xs font-semibold">{row.label}</span>
            <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
              {row.email}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
