"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { slugify } from "@/lib/slugify";
import { storeFormSchema } from "@/modules/admin/schemas/store-form-schema";

export type StoreActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

async function resolveUniqueSlug(
  tenantId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name) || "loja";
  let slug = base;
  let attempt = 2;

  while (true) {
    const exists = await prisma.store.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!exists) return slug;
    slug = `${base}-${attempt++}`;
  }
}

export async function upsertStore(
  _prev: StoreActionResult | null,
  formData: FormData,
): Promise<StoreActionResult> {
  const session = await requireRole(ALLOWED);

  const parsed = storeFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    kind: String(formData.get("kind") || ""),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }

  const { id, name, kind, isActive } = parsed.data;
  const slug = await resolveUniqueSlug(session.user.tenantId, name, id);

  let dbError: string | null = null;
  try {
    if (id) {
      await prisma.store.update({ where: { id }, data: { name, slug, kind, isActive } });
    } else {
      await prisma.store.create({
        data: { tenantId: session.user.tenantId, name, slug, kind, isActive },
      });
    }
  } catch {
    dbError = "Erro ao salvar a loja. Tente novamente.";
  }

  if (dbError) return { error: dbError };

  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
  redirect("/admin/lojas");
}

export async function deleteStore(formData: FormData) {
  await requireRole(ALLOWED);

  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/lojas");

  try {
    await prisma.userStore.deleteMany({ where: { storeId: id } });
    await prisma.store.delete({ where: { id } });
  } catch {
    // Silently ignore delete errors and redirect
  }

  revalidatePath("/admin/lojas");
  revalidatePath("/admin");
  redirect("/admin/lojas");
}
