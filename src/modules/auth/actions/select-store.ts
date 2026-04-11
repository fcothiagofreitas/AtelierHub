"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { ACTIVE_STORE_COOKIE } from "@/lib/session";

export async function selectStore(formData: FormData) {
  const session = await requireSession();
  const storeId = String(formData.get("storeId") ?? "");

  if (!storeId || !session.user.storeIds.includes(storeId)) {
    redirect("/select-store?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, storeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
