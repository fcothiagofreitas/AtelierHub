"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vincularPedidoNovoTrocaPorNumeros } from "@/modules/trocas/trocas-actions";

type Props = {
  storeId: string;
};

export function TrocasVincularForm({ storeId }: Props) {
  const router = useRouter();
  const [trocaNum, setTrocaNum] = React.useState("");
  const [pedNum, setPedNum] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const tn = Number(trocaNum.replace(/\D/g, ""));
    const pn = Number(pedNum.replace(/\D/g, ""));
    if (!Number.isFinite(tn) || tn <= 0 || !Number.isFinite(pn) || pn <= 0) {
      setMsg("Informe números válidos.");
      return;
    }
    setPending(true);
    try {
      const r = await vincularPedidoNovoTrocaPorNumeros({
        storeId,
        trocaNumero: tn,
        pedidoNumeroNovo: pn,
      });
      if ("error" in r) {
        setMsg(r.error);
        return;
      }
      setMsg("Associado com sucesso.");
      setPedNum("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-muted/15 p-4">
      <p className="text-sm font-medium">Associar pedido novo a uma troca</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Quando o cliente usar o crédito numa venda posterior, indique o n.º da troca e o n.º do novo
        pedido (mesmo cliente e loja).
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="trocaN">N.º troca</Label>
          <Input
            id="trocaN"
            value={trocaNum}
            onChange={(e) => setTrocaNum(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pedN">N.º pedido novo</Label>
          <Input
            id="pedN"
            value={pedNum}
            onChange={(e) => setPedNum(e.target.value)}
            className="w-28"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Associar"}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}
