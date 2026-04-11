"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugs";
import { requireRole } from "@/lib/authorization";
import { storeFormSchema } from "@/modules/admin/schemas/store-form-schema";

async function resolveUniqueStoreSlug(
  tenantId: string,
  baseName: string,
  currentStoreId?: string,
) {
  const baseSlug = slugify(baseName) || "loja";
  let slug = baseSlug;
  let attempt = 2;

  while (true) {
    const existing = await prisma.store.findFirst({
      where: {
        tenantId,
        slug,
        ...(currentStoreId ? { NOT: { id: currentStoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${attempt}`;
    attempt += 1;
  }
}

export async function upsertStore(formData: FormData) {
  const session = await requireRole([
    UserRole.ADMIN_DA_MARCA,
    UserRole.ADMINISTRATIVO,
  ]);

  const parsed = storeFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || "") || undefined,
    kind: String(formData.get("kind") || "OPERATIONAL"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    redirect("/administrativo/lojas?error=validation");
  }

  const { id, name, kind, isActive } = parsed.data;
  const slug = await resolveUniqueStoreSlug(session.user.tenantId ?? "", name, id);

  if (id) {
    await prisma.store.update({
      where: { id },
      data: { name, slug, kind, isActive },
    });
  } else {
    await prisma.store.create({
      data: {
        tenantId: session.user.tenantId ?? "",
        name,
        slug,
        kind,
        isActive,
      },
    });
  }

  revalidatePath("/administrativo");
  revalidatePath("/administrativo/lojas");
  redirect("/administrativo/lojas");
}
