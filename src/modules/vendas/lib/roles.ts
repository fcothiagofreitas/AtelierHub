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

/** Prazo de troca (dias) e parâmetros operacionais de troca. */
export const ROLES_CONFIG_PRAZO_TROCA: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
];
