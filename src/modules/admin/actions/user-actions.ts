"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { userFormSchema } from "@/modules/admin/schemas/user-form-schema";

export type UserActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

const DEFAULT_RESET_PASSWORD =
  process.env.DEFAULT_RESET_PASSWORD ?? "Mudar@123";

export async function upsertUser(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const session = await requireRole(ALLOWED);

  const parsed = userFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "").toLowerCase().trim(),
    role: String(formData.get("role") || ""),
    isActive: formData.get("isActive") === "on",
    password: String(formData.get("password") || "") || undefined,
    storeIds: formData.getAll("storeIds").map(String).filter(Boolean),
    defaultStoreId: String(formData.get("defaultStoreId") || ""),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }

  const { id, name, email, role, isActive, password, storeIds, defaultStoreId } =
    parsed.data;

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

  let dbError: string | null = null;
  try {
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
        await tx.userStore.deleteMany({ where: { userId: id } });
        await tx.userStore.createMany({
          data: storeIds.map((storeId) => ({
            userId: id,
            storeId,
            isDefault: storeId === defaultStoreId,
          })),
        });
      });
    } else {
      const hash = passwordHash ?? (await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10));
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId: session.user.tenantId,
            name,
            email,
            role,
            isActive,
            passwordHash: hash,
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
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return { fieldErrors: { email: "Já existe um usuário com este e-mail" } };
    }
    dbError = "Erro ao salvar o usuário. Tente novamente.";
  }

  if (dbError) return { error: dbError };

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  redirect("/admin/usuarios");
}

export async function resetUserPassword(formData: FormData) {
  await requireRole(ALLOWED);

  const userId = String(formData.get("userId") || "");
  if (!userId) redirect("/admin/usuarios");

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10) },
    });
  } catch {
    // ignore
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?reset=ok");
}

export async function toggleUserActive(formData: FormData) {
  await requireRole(ALLOWED);

  const userId = String(formData.get("userId") || "");
  const isActive = formData.get("isActive") === "true";

  if (!userId) redirect("/admin/usuarios");

  try {
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
  } catch {
    // ignore
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}
