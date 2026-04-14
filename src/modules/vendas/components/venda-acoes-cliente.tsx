"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReceberModal } from "@/modules/vendas/components/receber-modal";

/**
 * Acções do pedido no rodapé do PDV: Salvar (outline), Entregar (outline), Finalizar venda (primário).
 */
type Props = {
  storeId: string;
  pedidoId: string;
  totalPedido: number;
  totalJaPago: number;
  /** Fechar / guardar sem receber (ex.: fecha o modal de visualização). */
  onSalvar?: () => void;
  /** Desativa o primeiro botão outline (Salvar / Fechar). */
  salvarDisabled?: boolean;
  /** Texto do primeiro botão outline. */
  outlineButtonLabel?: string;
  showReceber?: boolean;
  /** Rótulo do botão primário (abre pagamento ou corre `onReceberPreparar`). */
  receberButtonLabel?: string;
  /** Desativa Finalizar venda (ex.: sem saldo / pedido quitado). */
  receberDisabled?: boolean;
  receberDisabledTitle?: string;
  /**
   * Quando definido (ex.: carrinho em rascunho), o clique em Finalizar venda corre isto
   * em vez de abrir o modal — o pai pode finalizar o pedido e abrir o modal no passo seguinte.
   */
  onReceberPreparar?: () => void | Promise<void>;
  /** Abre o modal de recebimento uma vez ao montar (ex.: após finalizar vindo do carrinho). */
  initialReceberOpen?: boolean;
  /** Chamado depois de consumir `initialReceberOpen` (abrir o modal). */
  onInitialReceberConsumed?: () => void;
  /** Entrega no balcão / retirada — substitui o toast por omissão. */
  onEntregar?: () => void;
  /** Quando false, oculta Entregar (só em ecrãs que não usam o trio completo). */
  showEntregar?: boolean;
  /** Desativa Entregar (ex.: ainda no carrinho ou sem consignado/corretor). */
  entregarDisabled?: boolean;
  entregarDisabledTitle?: string;
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
  receberButtonLabel = "Finalizar venda",
  receberDisabled = false,
  receberDisabledTitle,
  onReceberPreparar,
  initialReceberOpen = false,
  onInitialReceberConsumed,
  onEntregar,
  showEntregar = true,
  entregarDisabled = false,
  entregarDisabledTitle,
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
    if (entregarDisabled) return;
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
        {showEntregar ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={entregarDisabled}
            title={
              entregarDisabled
                ? entregarDisabledTitle ?? "Indisponível"
                : undefined
            }
            onClick={handleEntregar}
          >
            Entregar
          </Button>
        ) : null}
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
            {receberButtonLabel}
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
