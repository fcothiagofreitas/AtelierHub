"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReceberModal } from "@/modules/vendas/components/receber-modal";

type Props = {
  storeId: string;
  pedidoId: string;
  totalPedido: number;
  totalJaPago: number;
  /** Fechar / guardar sem receber (ex.: fecha o modal de visualização). */
  onSalvar?: () => void;
  /** Desativa o primeiro botão outline (guardar rascunho / em aberto). */
  salvarDisabled?: boolean;
  /** Texto do primeiro botão outline. */
  outlineButtonLabel?: string;
  showReceber?: boolean;
  /** Desativa Receber (ex.: leitura / sem saldo a receber). */
  receberDisabled?: boolean;
  receberDisabledTitle?: string;
  /**
   * Quando definido (ex.: carrinho em rascunho), o clique em Receber corre isto
   * em vez de abrir o modal — o pai pode finalizar o pedido e abrir o modal no passo seguinte.
   */
  onReceberPreparar?: () => void | Promise<void>;
  /** Abre o modal de recebimento uma vez ao montar (ex.: após finalizar vindo do carrinho). */
  initialReceberOpen?: boolean;
  /** Chamado depois de consumir `initialReceberOpen` (abrir o modal). */
  onInitialReceberConsumed?: () => void;
  /** Entrega no balcão / retirada — substitui o toast por omissão. */
  onEntregar?: () => void;
  /** Após pagamento com sucesso (refrescar dados do pedido). */
  onPagamentoRegistado?: () => void;
};

export function VendaAcoesCliente({
  storeId,
  pedidoId,
  totalPedido,
  totalJaPago,
  onSalvar,
  salvarDisabled = false,
  outlineButtonLabel = "Salvar",
  showReceber = true,
  receberDisabled = false,
  receberDisabledTitle,
  onReceberPreparar,
  initialReceberOpen = false,
  onInitialReceberConsumed,
  onEntregar,
  onPagamentoRegistado,
}: Props) {
  const [ReceberOpen, setReceberOpen] = React.useState(false);
  const initialConsumido = React.useRef(false);

  React.useEffect(() => {
    if (!initialReceberOpen || initialConsumido.current) return;
    initialConsumido.current = true;
    setReceberOpen(true);
    onInitialReceberConsumed?.();
  }, [initialReceberOpen, onInitialReceberConsumed]);

  const handleEntregar = () => {
    if (onEntregar) {
      onEntregar();
      return;
    }
    toast.message(
      "Entrega em balcão: registo detalhado será ligado ao pedido em breve.",
    );
  };

  const handleReceber = async () => {
    if (receberDisabled) return;
    if (onReceberPreparar) {
      await onReceberPreparar();
      return;
    }
    setReceberOpen(true);
  };

  const modalMontado =
    Boolean(showReceber && !receberDisabled && pedidoId) && !onReceberPreparar;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {onSalvar ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={salvarDisabled}
            onClick={onSalvar}
          >
            {outlineButtonLabel}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={handleEntregar}
        >
          Entregar
        </Button>
        {showReceber ? (
          <Button
            size="sm"
            type="button"
            disabled={receberDisabled}
            title={
              receberDisabled
                ? receberDisabledTitle ?? "Indisponível"
                : undefined
            }
            onClick={() => void handleReceber()}
          >
            Receber
          </Button>
        ) : null}
      </div>

      {modalMontado ? (
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
      ) : null}
    </>
  );
}
