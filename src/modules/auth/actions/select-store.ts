"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_STORE_COOKIE,
  getAccessibleStores,
  requireSession,
  serializeActiveStoreCookie,
} from "@/lib/session";

export async function setActiveStore(storeId: string) {
  const session = await requireSession();

  if (typeof storeId !== "string" || !storeId) {
    return {
      ok: false,
      message: "Loja invalida.",
    };
  }

  const availableStores = await getAccessibleStores();
  const selectedStore = availableStores.find((store) => store.id === storeId);

  if (!selectedStore) {
    return {
      ok: false,
      message: "Voce nao tem acesso a essa loja.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_STORE_COOKIE,
    serializeActiveStoreCookie({
      userId: session.user.id,
      storeId: selectedStore.id,
    }),
    {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    },
  );

  return {
    ok: true,
  };
}

export async function selectStore(formData: FormData) {
  const storeId = formData.get("storeId");

  if (typeof storeId !== "string" || !storeId) {
    redirect("/dashboard");
  }

  await setActiveStore(storeId);

  redirect("/dashboard");
}
