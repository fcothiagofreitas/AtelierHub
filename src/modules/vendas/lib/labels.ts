import type { FormaPagamento, PedidoEstado, PedidoModalidade } from "@prisma/client";

export const pedidoEstadoLabels: Record<PedidoEstado, string> = {
  EM_ANDAMENTO: "Em andamento",
  EM_ABERTO: "Em aberto",
  PAGO_PARCIAL: "Pago parcial",
  QUITADO: "Quitado",
  CANCELADO: "Cancelado",
};

export const pedidoModalidadeLabels: Record<PedidoModalidade, string> = {
  DIRETA: "Direta",
  CONSIGNADA: "Consignada",
};

export const formasPagamentoLabels: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  CARTAO_DEBITO: "Débito",
  CARTAO_CREDITO: "Crédito",
  PIX: "Pix",
  TRANSFERENCIA: "Transferência",
  CHEQUE: "Cheque",
  OUTROS: "Outros",
};

/** Formas exibidas no modal de recebimento (ordem do wireframe). */
export const formasPagamentoOrdem: FormaPagamento[] = [
  "DINHEIRO",
  "PIX",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "CHEQUE",
  "TRANSFERENCIA",
  "OUTROS",
];
