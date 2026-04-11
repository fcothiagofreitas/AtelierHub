import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { requireSession } from "@/lib/session";

export const roleLabels: Record<UserRole, string> = {
  ADMIN_DA_MARCA: "Admin da marca",
  ADMINISTRATIVO: "Administrativo",
  GERENTE_LOJA: "Gerente de loja",
  VENDEDOR: "Vendedor",
};

export function hasRequiredRole(
  currentRole: UserRole | undefined,
  allowedRoles: UserRole[],
) {
  if (!currentRole) {
    return false;
  }

  return allowedRoles.includes(currentRole);
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireSession();

  if (!hasRequiredRole(session.user.role, allowedRoles)) {
    redirect("/dashboard?denied=1");
  }

  return session;
}
