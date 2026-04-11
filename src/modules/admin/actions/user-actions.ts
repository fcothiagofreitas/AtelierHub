"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { userFormSchema } from "@/modules/admin/schemas/user-form-schema";

const RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD ?? "12345678";

export async function upsertUser(formData: FormData) {
  const session = await requireRole([
    UserRole.ADMIN_DA_MARCA,
    UserRole.ADMINISTRATIVO,
  ]);

  const parsed = userFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "").toLowerCase(),
    role: String(formData.get("role") || ""),
    isActive: formData.get("isActive") === "on",
    password: String(formData.get("password") || "") || undefined,
    storeIds: formData.getAll("storeIds").map(String),
    defaultStoreId: String(formData.get("defaultStoreId") || ""),
  });

  if (!parsed.success) {
    redirect("/administrativo/usuarios?error=validation");
  }

  const { id, name, email, role, isActive, password, storeIds, defaultStoreId } =
    parsed.data;

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

  if (id) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          role,
          isActive,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      await tx.userStore.deleteMany({
        where: { userId: id },
      });

      await tx.userStore.createMany({
        data: storeIds.map((storeId) => ({
          userId: id,
          storeId,
          isDefault: storeId === defaultStoreId,
        })),
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: session.user.tenantId ?? "",
          name,
          email,
          role,
          isActive,
          passwordHash: passwordHash ?? (await bcrypt.hash(RESET_PASSWORD, 10)),
        },
      });

      await tx.userStore.createMany({
        data: storeIds.map((storeId) => ({
          userId: user.id,
          storeId,
          isDefault: storeId === defaultStoreId,
        })),
      });
    });
  }

  revalidatePath("/administrativo");
  revalidatePath("/administrativo/usuarios");
  redirect("/administrativo/usuarios");
}

export async function resetUserPassword(formData: FormData) {
  await requireRole([UserRole.ADMIN_DA_MARCA, UserRole.ADMINISTRATIVO]);

  const userId = String(formData.get("userId") || "");

  if (!userId) {
    redirect("/administrativo/usuarios?error=reset");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(RESET_PASSWORD, 10),
    },
  });

  revalidatePath("/administrativo/usuarios");
  redirect("/administrativo/usuarios?reset=1");
}
