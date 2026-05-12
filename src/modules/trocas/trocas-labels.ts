import type { TrocaTipoFluxo } from "@prisma/client";

export function trocaTipoFluxoLabel(t: TrocaTipoFluxo): string {
  switch (t) {
    case "VENDA_QUITADA":
      return "Venda quitada";
    case "CONSIGNADO_NAO_QUITADO":
      return "Consignado (não quitado)";
    default:
      return t;
  }
}
