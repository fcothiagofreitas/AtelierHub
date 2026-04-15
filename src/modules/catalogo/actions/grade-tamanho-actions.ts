"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { flattenZodErrors } from "@/lib/form-utils";
import { parseListaOpcoesTamanho } from "@/lib/grade-tamanho-parse";
import {
  gradeTamanhoFormSchema,
  opcaoTamanhoFormSchema,
  resolveGradeTamanhoSlug,
  resolveOpcaoTamanhoSlug,
} from "@/modules/catalogo/schemas/grade-tamanho-schemas";

export type GradeTamanhoActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

async function uniqueGradeSlug(
  tenantId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await prisma.gradeTamanho.findFirst({
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

async function uniqueOpcaoSlugTx(
  tx: Prisma.TransactionClient,
  gradeTamanhoId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await tx.opcaoTamanho.findFirst({
      where: {
        gradeTamanhoId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function uniqueOpcaoSlug(
  gradeTamanhoId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const clash = await prisma.opcaoTamanho.findFirst({
      where: {
        gradeTamanhoId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

/** Cria ou atualiza a grade; em criação redireciona para a tela de opções. */
export async function upsertGradeTamanho(
  _prev: GradeTamanhoActionResult | null,
  formData: FormData,
): Promise<GradeTamanhoActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = gradeTamanhoFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveGradeTamanhoSlug(parsed.data);
  const slug = await uniqueGradeSlug(tenantId, baseSlug, parsed.data.id);

  let gradeId: string;
  try {
    if (parsed.data.id) {
      const existing = await prisma.gradeTamanho.findFirst({
        where: { id: parsed.data.id, tenantId },
      });
      if (!existing) return { error: "Grade não encontrada." };
      await prisma.gradeTamanho.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
      gradeId = parsed.data.id;
    } else {
      const created = await prisma.gradeTamanho.create({
        data: {
          tenantId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
      gradeId = created.id;
    }
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a grade." };
  }

  revalidatePath("/admin/catalogo/tamanhos");
  revalidatePath(`/admin/catalogo/tamanhos/${gradeId}/edit`);
  redirect(`/admin/catalogo/tamanhos/${gradeId}/edit`);
}

const novaGradeComOpcoesSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da grade."),
  slug: z.string().optional(),
  ordem: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

/** Cria grade + opções em um passo (tela “Nova grade”). */
export async function createGradeComOpcoes(
  _prev: GradeTamanhoActionResult | null,
  formData: FormData,
): Promise<GradeTamanhoActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const opcoesText = String(formData.get("opcoesText") || "");
  const nomesOpcoes = parseListaOpcoesTamanho(opcoesText);

  const parsed = novaGradeComOpcoesSchema.safeParse({
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  if (nomesOpcoes.length === 0) {
    return {
      fieldErrors: {
        opcoesText:
          "Informe ao menos uma variação. Ex.: P, PP, M, GG ou 36, 38, 40 — uma por linha ou separadas por vírgula.",
      },
    };
  }

  const data = parsed.data;
  const baseGradeSlug = resolveGradeTamanhoSlug({
    id: undefined,
    nome: data.nome,
    slug: data.slug,
    ordem: data.ordem,
    isActive: data.isActive,
  });
  const gradeSlug = await uniqueGradeSlug(tenantId, baseGradeSlug);

  let gradeId: string;
  try {
    gradeId = await prisma.$transaction(async (tx) => {
      const grade = await tx.gradeTamanho.create({
        data: {
          tenantId,
          nome: data.nome,
          slug: gradeSlug,
          ordem: data.ordem,
          isActive: data.isActive,
        },
      });

      for (let i = 0; i < nomesOpcoes.length; i++) {
        const nomeOpc = nomesOpcoes[i]!;
        const baseOpSlug = resolveOpcaoTamanhoSlug({
          id: undefined,
          gradeTamanhoId: grade.id,
          nome: nomeOpc,
          slug: undefined,
          ordem: i,
          isActive: true,
        });
        const opSlug = await uniqueOpcaoSlugTx(tx, grade.id, baseOpSlug);
        await tx.opcaoTamanho.create({
          data: {
            gradeTamanhoId: grade.id,
            nome: nomeOpc,
            slug: opSlug,
            ordem: i,
            isActive: true,
          },
        });
      }

      return grade.id;
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível criar a grade e as opções." };
  }

  revalidatePath("/admin/catalogo/tamanhos");
  revalidatePath(`/admin/catalogo/tamanhos/${gradeId}/edit`);
  redirect(`/admin/catalogo/tamanhos/${gradeId}/edit`);
}

export async function deleteGradeTamanho(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/tamanhos?e=id");

  const row = await prisma.gradeTamanho.findFirst({
    where: { id, tenantId },
    include: {
      _count: { select: { produtos: true } },
    },
  });
  if (!row) redirect("/admin/catalogo/tamanhos?e=nf");
  if (row._count.produtos > 0) redirect("/admin/catalogo/tamanhos?e=inuse");

  try {
    await prisma.gradeTamanho.delete({ where: { id } });
    revalidatePath("/admin/catalogo/tamanhos");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/tamanhos?e=db");
  }
  redirect("/admin/catalogo/tamanhos");
}

export async function upsertOpcaoTamanho(
  _prev: GradeTamanhoActionResult | null,
  formData: FormData,
): Promise<GradeTamanhoActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = opcaoTamanhoFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    gradeTamanhoId: String(formData.get("gradeTamanhoId") || ""),
    nome: String(formData.get("nome") || ""),
    slug: String(formData.get("slug") || ""),
    ordem: formData.get("ordem") ?? 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const grade = await prisma.gradeTamanho.findFirst({
    where: { id: parsed.data.gradeTamanhoId, tenantId },
  });
  if (!grade) return { error: "Grade não encontrada." };

  const baseSlug = resolveOpcaoTamanhoSlug(parsed.data);
  const slug = await uniqueOpcaoSlug(parsed.data.gradeTamanhoId, baseSlug, parsed.data.id);

  try {
    if (parsed.data.id) {
      const ex = await prisma.opcaoTamanho.findFirst({
        where: { id: parsed.data.id, gradeTamanho: { tenantId } },
      });
      if (!ex) return { error: "Opção não encontrada." };
      await prisma.opcaoTamanho.update({
        where: { id: parsed.data.id },
        data: {
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    } else {
      await prisma.opcaoTamanho.create({
        data: {
          gradeTamanhoId: parsed.data.gradeTamanhoId,
          nome: parsed.data.nome,
          slug,
          ordem: parsed.data.ordem,
          isActive: parsed.data.isActive,
        },
      });
    }
    revalidatePath(`/admin/catalogo/tamanhos/${parsed.data.gradeTamanhoId}/edit`);
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível salvar a opção." };
  }

  redirect(`/admin/catalogo/tamanhos/${parsed.data.gradeTamanhoId}/edit`);
}

/** Adiciona opção rápida (só nome + slug opcional) na grade — usado no editor. */
export async function addOpcaoTamanhoRapido(
  _prev: GradeTamanhoActionResult | null,
  formData: FormData,
): Promise<GradeTamanhoActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const gradeTamanhoId = String(formData.get("gradeTamanhoId") || "");
  const nome = String(formData.get("nome") || "").trim();
  const slugRaw = String(formData.get("slug") || "").trim();

  if (!gradeTamanhoId) return { fieldErrors: { nome: "Grade inválida." } };
  if (!nome) return { fieldErrors: { nome: "Informe o nome da opção." } };

  const grade = await prisma.gradeTamanho.findFirst({
    where: { id: gradeTamanhoId, tenantId },
  });
  if (!grade) return { error: "Grade não encontrada." };

  const maxOrdem = await prisma.opcaoTamanho.aggregate({
    where: { gradeTamanhoId },
    _max: { ordem: true },
  });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;

  const parsed = opcaoTamanhoFormSchema.safeParse({
    gradeTamanhoId,
    nome,
    slug: slugRaw,
    ordem,
    isActive: true,
  });
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const baseSlug = resolveOpcaoTamanhoSlug(parsed.data);
  const slug = await uniqueOpcaoSlug(gradeTamanhoId, baseSlug);

  try {
    await prisma.opcaoTamanho.create({
      data: {
        gradeTamanhoId,
        nome: parsed.data.nome,
        slug,
        ordem: parsed.data.ordem,
        isActive: true,
      },
    });
    revalidatePath(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit`);
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível adicionar a opção." };
  }

  redirect(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit`);
}

/** Form HTML `action` (sem `useActionState`). */
export async function addOpcaoTamanhoRapidoForm(formData: FormData): Promise<void> {
  void (await addOpcaoTamanhoRapido(null, formData));
}

export async function deleteOpcaoTamanho(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  const gradeTamanhoId = String(formData.get("gradeTamanhoId") || "");
  if (!id || !gradeTamanhoId) redirect("/admin/catalogo/tamanhos?e=id");

  const row = await prisma.opcaoTamanho.findFirst({
    where: { id, gradeTamanho: { tenantId } },
    include: { _count: { select: { variacoes: true } } },
  });
  if (!row) redirect(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit?e=nf`);
  if (row._count.variacoes > 0) redirect(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit?e=inuse`);

  try {
    await prisma.opcaoTamanho.delete({ where: { id } });
    revalidatePath(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit`);
  } catch (e) {
    console.error(e);
    redirect(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit?e=db`);
  }
  redirect(`/admin/catalogo/tamanhos/${gradeTamanhoId}/edit`);
}
