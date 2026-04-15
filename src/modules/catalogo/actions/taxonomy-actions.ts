"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { flattenZodErrors } from "@/lib/form-utils";
import {
  categoriaFormSchema,
  colecaoFormSchema,
  resolveCategoriaSlug,
  resolveColecaoSlug,
  resolveSubcategoriaSlug,
  resolveTipoSlug,
  subcategoriaFormSchema,
  tipoFormSchema,
} from "@/modules/catalogo/schemas/taxonomy-schemas";

export type TaxonomyActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

async function uniqueCategoriaSlug(
  tenantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await prisma.categoriaProduto.findFirst({
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

async function uniqueSubcategoriaSlug(
  categoriaId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await prisma.subcategoriaProduto.findFirst({
      where: {
        categoriaId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function uniqueTenantSlug(
  model: "tipoProduto" | "colecaoProduto",
  tenantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const where = {
      tenantId,
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    };
    const clash =
      model === "tipoProduto"
        ? await prisma.tipoProduto.findFirst({ where })
        : await prisma.colecaoProduto.findFirst({ where });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function upsertCategoria(
  _prev: TaxonomyActionResult | null,
  formData: FormData,
): Promise<TaxonomyActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = categoriaFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveCategoriaSlug(parsed.data);
  const slug = await uniqueCategoriaSlug(tenantId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const existing = await prisma.categoriaProduto.findFirst({
        where: { id: parsed.data.id, tenantId },
      });
      if (!existing) return { error: "Categoria não encontrada." };
      await prisma.categoriaProduto.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.categoriaProduto.create({
        data: {
          tenantId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath("/admin/catalogo/categorias");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a categoria." };
  }

  redirect("/admin/catalogo/categorias");
}

export async function deleteCategoria(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/categorias?e=id");

  const cat = await prisma.categoriaProduto.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { subcategorias: true, produtos: true } } },
  });
  if (!cat) redirect("/admin/catalogo/categorias?e=nf");
  if (cat._count.subcategorias > 0 || cat._count.produtos > 0) {
    redirect("/admin/catalogo/categorias?e=inuse");
  }

  try {
    await prisma.categoriaProduto.delete({ where: { id } });
    revalidatePath("/admin/catalogo/categorias");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/categorias?e=db");
  }
  redirect("/admin/catalogo/categorias");
}

export async function upsertSubcategoria(
  _prev: TaxonomyActionResult | null,
  formData: FormData,
): Promise<TaxonomyActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = subcategoriaFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    categoriaId: String(formData.get("categoriaId") || ""),
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const cat = await prisma.categoriaProduto.findFirst({
    where: { id: parsed.data.categoriaId, tenantId },
  });
  if (!cat) return { error: "Categoria inválida." };

  const baseSlug = resolveSubcategoriaSlug(parsed.data);
  const slug = await uniqueSubcategoriaSlug(parsed.data.categoriaId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const existing = await prisma.subcategoriaProduto.findFirst({
        where: { id: parsed.data.id, categoria: { tenantId } },
      });
      if (!existing) return { error: "Subcategoria não encontrada." };
      await prisma.subcategoriaProduto.update({
        where: { id: parsed.data.id },
        data: {
          categoriaId: parsed.data.categoriaId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.subcategoriaProduto.create({
        data: {
          categoriaId: parsed.data.categoriaId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath("/admin/catalogo/subcategorias");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a subcategoria." };
  }

  redirect("/admin/catalogo/subcategorias");
}

export async function deleteSubcategoria(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/subcategorias?e=id");

  const row = await prisma.subcategoriaProduto.findFirst({
    where: { id, categoria: { tenantId } },
    include: { _count: { select: { produtos: true } } },
  });
  if (!row) redirect("/admin/catalogo/subcategorias?e=nf");
  if (row._count.produtos > 0) redirect("/admin/catalogo/subcategorias?e=inuse");

  try {
    await prisma.subcategoriaProduto.delete({ where: { id } });
    revalidatePath("/admin/catalogo/subcategorias");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/subcategorias?e=db");
  }
  redirect("/admin/catalogo/subcategorias");
}

export async function upsertTipoProduto(
  _prev: TaxonomyActionResult | null,
  formData: FormData,
): Promise<TaxonomyActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = tipoFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveTipoSlug(parsed.data);
  const slug = await uniqueTenantSlug("tipoProduto", tenantId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const existing = await prisma.tipoProduto.findFirst({
        where: { id: parsed.data.id, tenantId },
      });
      if (!existing) return { error: "Tipo não encontrado." };
      await prisma.tipoProduto.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.tipoProduto.create({
        data: {
          tenantId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath("/admin/catalogo/tipos");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar o tipo." };
  }

  redirect("/admin/catalogo/tipos");
}

export async function deleteTipoProduto(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/tipos?e=id");

  const row = await prisma.tipoProduto.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { produtos: true } } },
  });
  if (!row) redirect("/admin/catalogo/tipos?e=nf");
  if (row._count.produtos > 0) redirect("/admin/catalogo/tipos?e=inuse");

  try {
    await prisma.tipoProduto.delete({ where: { id } });
    revalidatePath("/admin/catalogo/tipos");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/tipos?e=db");
  }
  redirect("/admin/catalogo/tipos");
}

export async function upsertColecaoProduto(
  _prev: TaxonomyActionResult | null,
  formData: FormData,
): Promise<TaxonomyActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = colecaoFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveColecaoSlug(parsed.data);
  const slug = await uniqueTenantSlug("colecaoProduto", tenantId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const existing = await prisma.colecaoProduto.findFirst({
        where: { id: parsed.data.id, tenantId },
      });
      if (!existing) return { error: "Coleção não encontrada." };
      await prisma.colecaoProduto.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.colecaoProduto.create({
        data: {
          tenantId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath("/admin/catalogo/colecoes");
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a coleção." };
  }

  redirect("/admin/catalogo/colecoes");
}

export async function deleteColecaoProduto(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/colecoes?e=id");

  const row = await prisma.colecaoProduto.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { produtos: true } } },
  });
  if (!row) redirect("/admin/catalogo/colecoes?e=nf");
  if (row._count.produtos > 0) redirect("/admin/catalogo/colecoes?e=inuse");

  try {
    await prisma.colecaoProduto.delete({ where: { id } });
    revalidatePath("/admin/catalogo/colecoes");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/colecoes?e=db");
  }
  redirect("/admin/catalogo/colecoes");
}
