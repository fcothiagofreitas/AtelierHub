"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completarComissoesVendedorEmPedidosQuitados } from "@/modules/comissoes/comissoes-actions";

export function ComissoesBackfillButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const r = await completarComissoesVendedorEmPedidosQuitados();
            if ("error" in r) {
              setMsg(r.error);
              return;
            }
            setMsg(
              r.pedidosAtualizados === 0
                ? "Nenhum pedido precisou de novo lançamento (ou ainda não há % configurado)."
                : `Criados lançamentos de vendedor em ${r.pedidosAtualizados} pedido(s) quitado(s).`,
            );
          });
        }}
      >
        {pending ? "A processar…" : "Completar comissões de vendedor em falta"}
      </Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
