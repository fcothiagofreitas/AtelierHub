"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { registrarPagamento } from "@/modules/vendas/pagamento-actions";
import { formasPagamentoLabels } from "@/modules/vendas/lib/labels";

const selectClass = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
);

export function PagamentoForm({
  storeId,
  pedidoId,
  saldoEmAberto,
}: {
  storeId: string;
  pedidoId: string;
  saldoEmAberto: number;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const [forma, setForma] = React.useState("PIX");
  const [valor, setValor] = React.useState(
    saldoEmAberto.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const [obs, setObs] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await registrarPagamento({
        storeId,
        pedidoId,
        forma: forma as Parameters<typeof registrarPagamento>[0]["forma"],
        valor,
        obs: obs || undefined,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Pagamento registrado.");
      setValor(
        saldoEmAberto.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
      setObs("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="forma">Forma de pagamento</Label>
          <select
            id="forma"
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className={selectClass}
          >
            {Object.entries(formasPagamentoLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor</Label>
          <Input
            id="valor"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="obs">Observação (opcional)</Label>
        <Input
          id="obs"
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: cheque nº 001, referência PIX…"
          maxLength={200}
        />
      </div>
      <Button type="submit" disabled={busy || !valor.trim()} className="w-full sm:w-auto">
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
        Registar pagamento
      </Button>
    </form>
  );
}
