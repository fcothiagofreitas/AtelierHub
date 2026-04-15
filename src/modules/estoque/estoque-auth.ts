import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

const ADMIN_ROLES: UserRole[] = ["ADMIN_DA_MARCA", "ADMINISTRATIVO"];

export function isAdministrativeStockRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Loja deve estar entre as lojas do utilizador (exceto se for admin de marca — aí pode operar em qualquer loja do tenant via UI). */
export function assertStoreInSession(session: Session, storeId: string): void {
  if (isAdministrativeStockRole(session.user.role)) {
    return;
  }
  if (!session.user.storeIds.includes(storeId)) {
    throw new Error("Sem permissão para esta loja.");
  }
}

/** Lista de lojas que o utilizador pode escolher em filtros (todas do tenant para admin; só as suas para outros). */
export function allowedStoreIdsFilter(
  session: Session,
  allTenantStoreIds: string[],
): string[] {
  if (isAdministrativeStockRole(session.user.role)) {
    return allTenantStoreIds;
  }
  return session.user.storeIds.filter((id) => allTenantStoreIds.includes(id));
}
