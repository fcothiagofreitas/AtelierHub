import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { requireSession } from "@/lib/session";

export const roleLabels: Record<UserRole, string> = {
  ADMIN_DA_MARCA: "Admin da marca",
  ADMINISTRATIVO: "Administrativo",
  GERENTE_LOJA: "Gerente de loja",
  VENDEDOR: "Vendedor",
};

export async function requireRole(allowed: UserRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard?denied=1");
  }
  return session;
}
