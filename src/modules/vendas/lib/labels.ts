import type { PedidoEstado, PedidoModalidade } from "@prisma/client";

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
