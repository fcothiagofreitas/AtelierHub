import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { requireSession } from "@/lib/session";

export { roleLabels } from "@/lib/roles";

export async function requireRole(allowed: UserRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard?denied=1");
  }
  return session;
}
