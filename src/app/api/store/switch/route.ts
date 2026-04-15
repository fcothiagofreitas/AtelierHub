import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_STORE_COOKIE } from "@/lib/session";
import { isAdministrativeStockRole } from "@/modules/estoque/estoque-auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const storeId = String(form.get("storeId") ?? "");

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
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, storeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
