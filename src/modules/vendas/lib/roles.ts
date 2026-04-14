import type { UserRole } from "@prisma/client";

export const ROLES_ACESSO_VENDAS: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
  "VENDEDOR",
];

/** No PDV, podem mudar o vendedor depois de o pedido ter sido iniciado (rascunho com ID). */
export const ROLES_ALTERAR_VENDEDOR_PDV: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
];
