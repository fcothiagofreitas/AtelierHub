import type { UserRole } from "@prisma/client";

/** Quem pode listar e cadastrar clientes (operação + admin). */
export const ROLES_ACESSO_CLIENTES: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
  "VENDEDOR",
];
