"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  estoqueAjusteConferencia,
  type EstoqueActionResult,
} from "@/modules/estoque/actions/estoque-actions";

type Props = {
  stores: { id: string; name: string; kind: string }[];
  defaultStoreId: string | null;
};

export function EstoqueConferenciaForm({ stores, defaultStoreId }: Props) {
  const [state, action, pending] = useActionState(
    estoqueAjusteConferencia,
    null as EstoqueActionResult | null,
  );

  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("ean-conf") as HTMLInputElement | null;
      if (el) el.value = "";
    }
  }, [state?.ok]);

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && <p className="text-sm text-muted-foreground">Ajuste registado.</p>}
      <p className="text-sm text-muted-foreground leading-relaxed">
        Use um delta <strong>positivo</strong> para corrigir falta encontrada na conferência, ou{" "}
        <strong>negativo</strong> para sobra. Isto corresponde a um ajuste de inventário / conferência de receção
        (MVP).
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="storeId-conf">Loja</Label>
        <select
          id="storeId-conf"
          name="storeId"
          required
          defaultValue={defaultStoreId ?? stores[0]?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background ps-3 pe-10 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ean-conf">EAN-13</Label>
        <Input id="ean-conf" name="ean" placeholder="13 dígitos" inputMode="numeric" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="delta-conf">Delta (peças)</Label>
        <Input id="delta-conf" name="delta" type="number" step={1} required placeholder="Ex.: -2 ou +3" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="motivo-conf">Motivo (recomendado)</Label>
        <Input id="motivo-conf" name="motivo" placeholder="Ex.: conferência recebimento fornecedor X" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "A registar…" : "Registar ajuste"}
      </Button>
    </form>
  );
}
