"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";
import { criarGrupoCobranca } from "@/modules/vendas/cobranca-actions";
import type { GrupoCobrancaTipo } from "@prisma/client";
import type { PedidoAbertoGrupoRow } from "@/modules/vendas/cobranca-queries";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Props = {
  storeId: string;
  tipo: GrupoCobrancaTipo;
  pedidos: PedidoAbertoGrupoRow[];
};

export function GrupoCobrancaNovoForm({ storeId, tipo, pedidos }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const p of pedidos) s.add(p.id);
    return s;
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = [...selected];
    if (ids.length === 0) {
      toast.error("Selecione pelo menos um pedido.");
      return;
    }
    setBusy(true);
    try {
      const r = await criarGrupoCobranca({ storeId, tipo, pedidoIds: ids });
      if (!("ok" in r) || !r.ok) {
        toast.error("error" in r ? r.error : "Não foi possível criar o lote.");
        return;
      }
      toast.success("Lote criado.");
      router.push(`/vendas/cobrancas/${r.grupoId}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (pedidos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há pedidos com saldo em aberto para este{" "}
        {tipo === "CLIENTE" ? "cliente" : "corretor"}.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2 font-medium" />
              <th className="px-3 py-2 font-medium">Nº</th>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pedidos.map((p) => (
              <tr key={p.id} className="bg-card">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    disabled={busy}
                    className="size-4 rounded border"
                    aria-label={`Incluir pedido ${p.numero}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">{p.numero}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateBr(p.createdAt)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {money.format(p.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-muted-foreground">
            Total selecionado (saldos)
          </Label>
          <p className="text-lg font-semibold tabular-nums">
            {money.format(
              pedidos
                .filter((p) => selected.has(p.id))
                .reduce((a, p) => a + p.saldo, 0),
            )}
          </p>
        </div>
        <Button type="submit" disabled={busy || selected.size === 0}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Criar lote e continuar
        </Button>
      </div>
    </form>
  );
}
