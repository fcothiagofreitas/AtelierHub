import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_STORE_COOKIE = "atelierhub-active-store";

type PersistedActiveStore = {
  userId: string;
  storeId: string;
};

export function serializeActiveStoreCookie(value: PersistedActiveStore) {
  return JSON.stringify(value);
}

export function parseActiveStoreCookie(
  value: string | undefined,
): PersistedActiveStore | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PersistedActiveStore>;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.storeId !== "string" ||
      !parsed.userId ||
      !parsed.storeId
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      storeId: parsed.storeId,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function getAccessibleStoresForUser(
  tenantId: string | undefined,
  storeIds: string[] | undefined,
) {
  if (!tenantId || !storeIds || storeIds.length === 0) {
    return [];
  }

  return prisma.store.findMany({
    where: {
      tenantId,
      id: {
        in: storeIds,
      },
      isActive: true,
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function getAccessibleStores() {
  const session = await requireSession();
  const storeIds = session.user.storeIds ?? [];

  return getAccessibleStoresForUser(session.user.tenantId, storeIds);
}

export async function getActiveStoreContext() {
  const session = await requireSession();
  const availableStores = await getAccessibleStoresForUser(
    session.user.tenantId,
    session.user.storeIds,
  );

  if (availableStores.length === 0) {
    return {
      session,
      availableStores,
      activeStore: null,
      hasPersistedStoreSelection: false,
    };
  }

  const cookieStore = await cookies();
  const persistedStore = parseActiveStoreCookie(
    cookieStore.get(ACTIVE_STORE_COOKIE)?.value,
  );
  const persistedStoreId =
    persistedStore?.userId === session.user.id ? persistedStore.storeId : null;

  const activeStore =
    availableStores.find((store) => store.id === persistedStoreId) ??
    availableStores.find((store) => store.id === session.user.defaultStoreId) ??
    availableStores[0];

  return {
    session,
    availableStores,
    activeStore,
    hasPersistedStoreSelection: Boolean(
      persistedStoreId &&
        availableStores.some((store) => store.id === persistedStoreId),
    ),
  };
}
