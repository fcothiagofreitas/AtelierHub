"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ACTIVE_STORE_COOKIE } from "@/lib/session";
import { isAdministrativeStockRole } from "@/modules/estoque/estoque-auth";

export async function selectStore(formData: FormData) {
  const session = await requireSession();
  const storeId = String(formData.get("storeId") ?? "");

  const store = storeId
    ? await prisma.store.findFirst({
        where: {
          id: storeId,
          tenantId: session.user.tenantId,
          isActive: true,
        },
        select: { id: true },
      })
    : null;

  const allowed =
    !!store &&
    (isAdministrativeStockRole(session.user.role) ||
      session.user.storeIds.includes(storeId));

  if (!allowed) {
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
