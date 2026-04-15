import type { CorretorPaymentMethod } from "@prisma/client";

export const corretorPaymentLabels: Record<CorretorPaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Espécie",
  BANK_TRANSFER: "Transferência bancária",
};
