"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ReceberPagamentoForm } from "@/modules/vendas/components/receber-pagamento-form";

type Props = {
  open: boolean;
  onClose: () => void;
  storeId: string;
  pedidoId: string;
  /** Total bruto do pedido (Soma dos itens). */
  totalPedido: number;
  /** Total já pago em pagamentos anteriores. */
  totalJaPago: number;
  /** Chamado quando o pagamento for confirmado com sucesso. */
  onConfirm?: () => void;
};

export function ReceberModal({
  open,
  onClose,
  storeId,
  pedidoId,
  totalPedido,
  totalJaPago,
  onConfirm,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0",
          "w-[min(920px,calc(100vw-2rem))] max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>

        <ReceberPagamentoForm
          storeId={storeId}
          pedidoId={pedidoId}
          totalPedido={totalPedido}
          totalJaPago={totalJaPago}
          resetKey={open ? "open" : "closed"}
          onSubmittingChange={setSubmitting}
          onSuccess={() => {
            onConfirm?.();
            onClose();
          }}
          showFooterButtons
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
