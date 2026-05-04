"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateBr } from "@/lib/format-date-br";
import { cn } from "@/lib/utils";
import type { GrupoCobrancaDetalhe } from "@/modules/vendas/cobranca-queries";
import { ReceberGrupoModal } from "@/modules/vendas/components/receber-grupo-modal";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function GrupoCobrancaDetalheClient({
  detalhe,
  storeId,
  storeName,
}: {
  detalhe: GrupoCobrancaDetalhe;
  storeId: string;
  storeName: string;
}) {
  const router = useRouter();
  const [receberOpen, setReceberOpen] = React.useState(false);

  const titulo =
    detalhe.tipo === "CLIENTE"
      ? `Lote — ${detalhe.cliente?.label ?? "Cliente"}`
      : `Lote — corretor ${detalhe.corretor?.name ?? "—"}`;

  const podeReceber = detalhe.saldoGrupo > 0.004;
  const criadoEm =
    typeof detalhe.createdAt === "string"
      ? new Date(detalhe.createdAt)
      : detalhe.createdAt;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loja {storeName} · criado em {formatDateBr(criadoEm)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {detalhe.tipo === "CLIENTE" ? "Por cliente" : "Por corretor"}
            </Badge>
            {!podeReceber ? (
              <Badge variant="outline" className="text-green-700 dark:text-green-400">
                Lote quitado
              </Badge>
            ) : null}
          </div>
        </div>
        <Link
          href="/contas-receber"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Contas a receber
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Já pago</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {detalhe.itens.map((it) => (
              <tr key={it.pedidoId} className="bg-card">
                <td className="px-4 py-3 font-mono tabular-nums">nº {it.numero}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {money.format(it.total)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {money.format(it.jaPago)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {money.format(it.saldo)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/vendas?pdv=1&view=${encodeURIComponent(it.pedidoId)}&pagamento=1`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "text-primary",
                    )}
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium">
            Saldo do lote:{" "}
            <span className="tabular-nums">{money.format(detalhe.saldoGrupo)}</span>
          </p>
          <button
            type="button"
            disabled={!podeReceber}
            onClick={() => setReceberOpen(true)}
            className={cn(
              buttonVariants(),
              !podeReceber && "pointer-events-none opacity-50",
            )}
          >
            Receber
          </button>
        </div>
      </div>

      <ReceberGrupoModal
        open={receberOpen}
        onClose={() => setReceberOpen(false)}
        storeId={storeId}
        grupoId={detalhe.id}
        saldoGrupo={detalhe.saldoGrupo}
        onConfirm={() => router.refresh()}
      />
    </div>
  );
}
