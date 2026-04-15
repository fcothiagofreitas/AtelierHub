import type { UserRole } from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  ADMIN_DA_MARCA: "Admin da marca",
  ADMINISTRATIVO: "Administrativo",
  GERENTE_LOJA: "Gerente de loja",
  VENDEDOR: "Vendedor",
};
