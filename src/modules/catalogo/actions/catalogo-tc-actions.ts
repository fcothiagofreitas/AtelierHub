"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { flattenZodErrors } from "@/lib/form-utils";
import { catalogoCorFormSchema, resolveCatalogoCorSlug } from "@/modules/catalogo/schemas/catalogo-tc-schemas";

export type CatalogoTcActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

async function uniqueCorSlug(
  tenantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await prisma.catalogoCor.findFirst({
      where: {
        tenantId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function upsertCatalogoCor(
  _prev: CatalogoTcActionResult | null,
  formData: FormData,
): Promise<CatalogoTcActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = catalogoCorFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveCatalogoCorSlug(parsed.data);
  const slug = await uniqueCorSlug(tenantId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const existing = await prisma.catalogoCor.findFirst({
        where: { id: parsed.data.id, tenantId },
      });
      if (!existing) return { error: "Cor não encontrada." };
      await prisma.catalogoCor.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.catalogoCor.create({
        data: {
          tenantId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath("/admin/catalogo/cores");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a cor." };
  }

  redirect("/admin/catalogo/cores");
}

export type CorRapidaResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const corRapidaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da cor."),
  slug: z.string().optional(),
});

/** Adiciona uma cor e permanece na mesma tela (fluxo contínuo). */
export async function addCatalogoCorRapido(
  _prev: CorRapidaResult | null,
  formData: FormData,
): Promise<CorRapidaResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = corRapidaSchema.safeParse({
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || "").trim() || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveCatalogoCorSlug({
    nome: parsed.data.nome,
    slug: parsed.data.slug,
    ordem: 0,
    isActive: true,
  });
  const slug = await uniqueCorSlug(tenantId, baseSlug);

  const maxOrdem = await prisma.catalogoCor.aggregate({
    where: { tenantId },
    _max: { ordem: true },
  });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;

  try {
    await prisma.catalogoCor.create({
      data: {
        tenantId,
        nome: parsed.data.nome,
        slug,
        ordem,
        isActive: true,
      },
    });
    revalidatePath("/admin/catalogo/cores/new");
    revalidatePath("/admin/catalogo/cores");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a cor." };
  }

  return { ok: true };
}

export async function deleteCatalogoCor(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/cores?e=id");

  const row = await prisma.catalogoCor.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { variacoes: true } } },
  });
  if (!row) redirect("/admin/catalogo/cores?e=nf");
  if (row._count.variacoes > 0) redirect("/admin/catalogo/cores?e=inuse");

  try {
    await prisma.catalogoCor.delete({ where: { id } });
    revalidatePath("/admin/catalogo/cores");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/cores?e=db");
  }
  redirect("/admin/catalogo/cores");
}
