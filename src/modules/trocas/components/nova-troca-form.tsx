"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buscarPedidoParaTroca,
  registrarTroca,
  type BuscarPedidoTrocaOk,
} from "@/modules/trocas/trocas-actions";
import { trocaTipoFluxoLabel } from "@/modules/trocas/trocas-labels";

type Props = {
  storeId: string;
};

export function NovaTrocaForm({ storeId }: Props) {
  const router = useRouter();
  const [numero, setNumero] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<BuscarPedidoTrocaOk | null>(null);
  const [qty, setQty] = React.useState<Record<string, string>>({});
  const [obs, setObs] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function handleBuscar() {
    setError(null);
    setPreview(null);
    const n = Number(numero.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Informe o número do pedido.");
      return;
    }
    setLoading(true);
    try {
      const r = await buscarPedidoParaTroca({ storeId, pedidoNumero: n });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setPreview(r);
      const q: Record<string, string> = {};
      for (const it of r.itens) {
        q[it.pedidoItemId] = it.disponivel > 0 ? String(it.disponivel) : "0";
      }
      setQty(q);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    const itens: { pedidoItemId: string; quantidade: number }[] = [];
    for (const it of preview.itens) {
      const q = Number(String(qty[it.pedidoItemId] ?? "0").replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) continue;
      if (q > it.disponivel) {
        setError(`Quantidade inválida para «${it.label}».`);
        return;
      }
      itens.push({ pedidoItemId: it.pedidoItemId, quantidade: Math.floor(q) });
    }
    if (itens.length === 0) {
      setError("Indique quantidade em pelo menos uma linha com stock disponível.");
      return;
    }
    setSaving(true);
    try {
      const n = Number(numero.replace(/\D/g, ""));
      const r = await registrarTroca({
        storeId,
        pedidoNumero: n,
        itens,
        obs: obs.trim() || null,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.push("/vendas/trocas");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pedidoNum">N.º do pedido</Label>
          <Input
            id="pedidoNum"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="ex.: 42"
            className="w-40"
          />
        </div>
        <Button type="button" variant="secondary" onClick={handleBuscar} disabled={loading}>
          {loading ? "A carregar…" : "Carregar pedido"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {preview && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Cliente:</span>{" "}
              <span className="font-medium">{preview.clienteNome}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Fluxo:</span>{" "}
              {trocaTipoFluxoLabel(preview.tipoFluxo)}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Artigo</th>
                  <th className="px-3 py-2 text-right">Qtd pedido</th>
                  <th className="px-3 py-2 text-right">Disponível</th>
                  <th className="px-3 py-2 text-right">Preço unit.</th>
                  <th className="px-3 py-2 text-right">A devolver</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.itens.map((it) => (
                  <tr key={it.pedidoItemId}>
                    <td className="px-3 py-2">{it.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.quantidadePedido}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.disponivel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.precoUnitario}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        className="ms-auto h-8 w-20 text-right"
                        value={qty[it.pedidoItemId] ?? "0"}
                        onChange={(e) =>
                          setQty((prev) => ({
                            ...prev,
                            [it.pedidoItemId]: e.target.value,
                          }))
                        }
                        disabled={it.disponivel <= 0}
                        inputMode="numeric"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Input id="obs" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "A registar…" : "Confirmar troca"}
          </Button>
        </form>
      )}
    </div>
  );
}
