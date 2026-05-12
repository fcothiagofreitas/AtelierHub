"use client";

import { useActionState } from "react";
import type { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarPrazoTrocaTenant } from "@/modules/trocas/trocas-actions";
import { ROLES_CONFIG_PRAZO_TROCA } from "@/modules/vendas/lib/roles";

type Props = {
  prazoAtual: number | null;
  userRole: UserRole;
};

export function TrocasPrazoForm({ prazoAtual, userRole }: Props) {
  const pode = ROLES_CONFIG_PRAZO_TROCA.includes(userRole);
  const [state, action, pending] = useActionState(atualizarPrazoTrocaTenant, null);

  if (!pode) return null;

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="prazoTrocaDias">Prazo troca — venda quitada (dias)</Label>
        <p className="text-xs text-muted-foreground">
          Contados a partir da data do pedido. Vazio = sem limite no sistema.
        </p>
        <Input
          id="prazoTrocaDias"
          name="prazoTrocaDias"
          type="text"
          inputMode="numeric"
          placeholder="ex.: 30"
          defaultValue={prazoAtual ?? ""}
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "…" : "Guardar"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-muted-foreground">Actualizado.</p>}
    </form>
  );
}
