import type { UserRole } from "@prisma/client";

/** Consulta saldos e histórico. */
export const ESTOQUE_ROLES_LEITURA: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
  "VENDEDOR",
];

/** Entrada, saída, transferência, ajuste. */
export const ESTOQUE_ROLES_ESCRITA: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
];
