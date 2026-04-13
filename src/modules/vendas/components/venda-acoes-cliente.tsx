"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReceberModal } from "@/modules/vendas/components/receber-modal";

type Props = {
  storeId: string;
  pedidoId: string;
  totalPedido: number;
  totalJaPago: number;
  /** Fechar / guardar sem receber (ex.: fecha o modal de visualização). */
  onSalvar?: () => void;
  showReceber?: boolean;
  /** Após pagamento com sucesso (refrescar dados do pedido). */
  onPagamentoRegistado?: () => void;
};

export function VendaAcoesCliente({
  storeId,
  pedidoId,
  totalPedido,
  totalJaPago,
  onSalvar,
  showReceber = true,
  onPagamentoRegistado,
}: Props) {
  const [ReceberOpen, setReceberOpen] = React.useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {onSalvar ? (
          <Button variant="outline" size="sm" type="button" onClick={onSalvar}>
            Salvar
          </Button>
        ) : null}
        <Button variant="outline" size="sm" type="button" disabled title="Em breve">
          Entregar
        </Button>
        {showReceber ? (
          <Button size="sm" type="button" onClick={() => setReceberOpen(true)}>
            Receber
          </Button>
        ) : null}
      </div>

      <ReceberModal
        open={ReceberOpen}
        onClose={() => setReceberOpen(false)}
        storeId={storeId}
        pedidoId={pedidoId}
        totalPedido={totalPedido}
        totalJaPago={totalJaPago}
        onConfirm={() => {
          setReceberOpen(false);
          onPagamentoRegistado?.();
        }}
      />
    </>
  );
}
