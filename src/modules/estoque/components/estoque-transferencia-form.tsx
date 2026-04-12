"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  estoqueTransferencia,
  type EstoqueActionResult,
} from "@/modules/estoque/actions/estoque-actions";

type Props = {
  stores: { id: string; name: string; kind: string }[];
  defaultOrigemId: string | null;
  defaultDestinoId: string | null;
};

export function EstoqueTransferenciaForm({ stores, defaultOrigemId, defaultDestinoId }: Props) {
  const [state, action, pending] = useActionState(estoqueTransferencia, null as EstoqueActionResult | null);

  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("ean-tr") as HTMLInputElement | null;
      if (el) el.value = "";
    }
  }, [state?.ok]);

  const op = stores.filter((s) => s.kind === "OPERATIONAL");
  const admin = stores.find((s) => s.kind === "ADMINISTRATIVE");

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && <p className="text-sm text-muted-foreground">Transferência concluída.</p>}
      <div className="space-y-1.5">
        <Label htmlFor="storeOrigemId">Origem</Label>
        <select
          id="storeOrigemId"
          name="storeOrigemId"
          required
          defaultValue={defaultOrigemId ?? admin?.id ?? op[0]?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="storeDestinoId">Destino</Label>
        <select
          id="storeDestinoId"
          name="storeDestinoId"
          required
          defaultValue={
            defaultDestinoId ??
            (op.find((s) => s.id !== (defaultOrigemId ?? admin?.id))?.id ?? op[1]?.id ?? stores[0]?.id)
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ean-tr">EAN-13</Label>
        <Input id="ean-tr" name="ean" placeholder="13 dígitos" inputMode="numeric" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="q-tr">Quantidade</Label>
        <Input id="q-tr" name="quantidade" type="number" min={1} step={1} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "A transferir…" : "Transferir"}
      </Button>
    </form>
  );
}
