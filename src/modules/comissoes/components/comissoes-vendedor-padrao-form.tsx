"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  atualizarComissaoVendedorPadrao,
  type ComissaoConfigActionResult,
} from "@/modules/comissoes/comissoes-actions";

type Props = {
  percentualAtual: number;
};

export function ComissoesVendedorPadraoForm({ percentualAtual }: Props) {
  const [state, action, pending] = useActionState(
    atualizarComissaoVendedorPadrao,
    null as ComissaoConfigActionResult | null,
  );
  const [pct, setPct] = useState(() => String(percentualAtual));

  useEffect(() => {
    setPct(String(percentualAtual));
  }, [percentualAtual]);

  return (
    <form action={action} className="max-w-md space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">Comissão de vendedor (padrão da marca)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Aplica-se quando o colaborador tem <strong>comissão mínima (%)</strong> igual a zero no
          cadastro. Percentuais próprios do vendedor e do corretor continuam a ter prioridade nos
          respectivos cadastros.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="percentualComissaoVendedorPadrao">Percentual (%)</Label>
        <Input
          id="percentualComissaoVendedorPadrao"
          name="percentualComissaoVendedorPadrao"
          type="text"
          inputMode="decimal"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-muted-foreground">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "A guardar…" : "Guardar"}
      </Button>
    </form>
  );
}
