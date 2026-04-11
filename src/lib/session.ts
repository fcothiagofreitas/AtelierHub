import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_STORE_COOKIE = "atelierhub-active-store";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return session;
}

export async function getActiveStoreContext() {
  const session = await requireSession();

  const stores = await prisma.store.findMany({
    where: {
      tenantId: session.user.tenantId,
      id: { in: session.user.storeIds },
      isActive: true,
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  if (stores.length === 0) {
    return { session, stores, activeStore: null, needsStoreSelection: false };
  }

  const cookieStore = await cookies();
  const persistedId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value ?? null;
  const persistedStore = stores.find((s) => s.id === persistedId) ?? null;

  // Usuário com múltiplas lojas sem seleção explícita → deve escolher
  const needsStoreSelection = stores.length > 1 && persistedStore === null;

  const activeStore =
    persistedStore ??
    stores.find((s) => s.id === session.user.defaultStoreId) ??
    stores[0];

  return { session, stores, activeStore, needsStoreSelection };
}
