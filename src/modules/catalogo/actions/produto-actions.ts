"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { buildEan13FromBody12 } from "@/lib/ean13";
import { emptyToUndefined, flattenZodErrors } from "@/lib/form-utils";
import { isValidEan13 } from "@/lib/ean13";
import { formatNomeGrade } from "@/lib/produto-grade";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";
import { produtoFormSchema } from "@/modules/catalogo/schemas/produto-schemas";

export type ProdutoActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

export async function gerarProximoEan13(): Promise<{ ean13?: string; error?: string }> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  try {
    const ean13 = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenantId },
        data: { eanSequence: { increment: 1 } },
        select: { eanSequence: true },
      });
      const body = `789${String(t.eanSequence).padStart(9, "0")}`;
      return buildEan13FromBody12(body);
    });
    return { ean13 };
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível gerar o EAN-13." };
  }
}

export async function upsertProduto(
  _prev: ProdutoActionResult | null,
  formData: FormData,
): Promise<ProdutoActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  let variacoesJson: unknown = [];
  try {
    variacoesJson = JSON.parse(String(formData.get("variacoes") || "[]"));
  } catch {
    return { error: "Formato de variações inválido." };
  }

  const parsed = produtoFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    referencia: String(formData.get("referencia") || ""),
    nome: String(formData.get("nome") || ""),
    descricao: String(formData.get("descricao") || ""),
    categoriaId: String(formData.get("categoriaId") || ""),
    subcategoriaId: String(formData.get("subcategoriaId") || ""),
    tipoId: String(formData.get("tipoId") || ""),
    colecaoId: String(formData.get("colecaoId") || ""),
    gradeTamanhoId: String(formData.get("gradeTamanhoId") || ""),
    isActive: formData.get("isActive") === "on",
    precoVenda: String(formData.get("precoVenda") || ""),
    ncm: String(formData.get("ncm") || ""),
    cest: String(formData.get("cest") || ""),
    origemMercadoria: String(formData.get("origemMercadoria") || ""),
    unidadeTributavel: String(formData.get("unidadeTributavel") || ""),
    variacoes: variacoesJson,
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const data = parsed.data;
  const categoriaId = emptyToUndefined(data.categoriaId);
  const subcategoriaId = emptyToUndefined(data.subcategoriaId);
  const tipoId = emptyToUndefined(data.tipoId);
  const colecaoId = emptyToUndefined(data.colecaoId);
  const descricao = emptyToUndefined(data.descricao?.trim());
  const referencia = emptyToUndefined(data.referencia?.trim());
  const ncm = emptyToUndefined(data.ncm?.replace(/\D/g, ""));
  const cest = emptyToUndefined(data.cest?.replace(/\D/g, ""));
  const unidadeTributavel = emptyToUndefined(data.unidadeTributavel?.trim());
  const origRaw = emptyToUndefined(data.origemMercadoria?.trim());
  const origemMercadoria =
    origRaw != null && origRaw !== "" ? Number.parseInt(origRaw, 10) : null;

  const precoParsed = parseCreditLimitField(data.precoVenda);
  if (!precoParsed.ok) {
    return { fieldErrors: { precoVenda: "Preço de venda inválido." } };
  }
  const precoVenda =
    precoParsed.value != null ? new Prisma.Decimal(precoParsed.value) : null;

  let resolvedCategoriaId = categoriaId;

  if (categoriaId) {
    const ok = await prisma.categoriaProduto.findFirst({
      where: { id: categoriaId, tenantId },
    });
    if (!ok) return { error: "Categoria inválida." };
  }
  if (subcategoriaId) {
    const sub = await prisma.subcategoriaProduto.findFirst({
      where: { id: subcategoriaId, categoria: { tenantId } },
    });
    if (!sub) return { error: "Subcategoria inválida." };
    if (categoriaId && sub.categoriaId !== categoriaId) {
      return { error: "A subcategoria não pertence à categoria selecionada." };
    }
    resolvedCategoriaId = categoriaId ?? sub.categoriaId;
  }
  if (tipoId) {
    const ok = await prisma.tipoProduto.findFirst({ where: { id: tipoId, tenantId } });
    if (!ok) return { error: "Tipo inválido." };
  }
  if (colecaoId) {
    const ok = await prisma.colecaoProduto.findFirst({ where: { id: colecaoId, tenantId } });
    if (!ok) return { error: "Coleção inválida." };
  }

  const gradeTamanhoId = emptyToUndefined(data.gradeTamanhoId);
  if (data.variacoes.length > 0) {
    if (!gradeTamanhoId) {
      return { fieldErrors: { gradeTamanhoId: "Selecione a grade de tamanhos." } };
    }
    const grade = await prisma.gradeTamanho.findFirst({
      where: { id: gradeTamanhoId, tenantId },
    });
    if (!grade) return { error: "Grade de tamanhos inválida." };
  }

  const opcaoIds = [...new Set(data.variacoes.map((v) => v.opcaoTamanhoId))];
  const corIds = [...new Set(data.variacoes.map((v) => v.corCatalogoId))];

  const [opcoes, cores] = await Promise.all([
    prisma.opcaoTamanho.findMany({
      where: {
        id: { in: opcaoIds },
        gradeTamanho: { tenantId },
        ...(gradeTamanhoId ? { gradeTamanhoId } : {}),
      },
      select: { id: true, nome: true, gradeTamanhoId: true },
    }),
    prisma.catalogoCor.findMany({
      where: { tenantId, id: { in: corIds } },
      select: { id: true, nome: true },
    }),
  ]);

  const mapTam = new Map(opcoes.map((t) => [t.id, t.nome]));
  const mapGradeOpcao = new Map(opcoes.map((t) => [t.id, t.gradeTamanhoId]));
  const mapCor = new Map(cores.map((c) => [c.id, c.nome]));

  for (let i = 0; i < data.variacoes.length; i++) {
    const v = data.variacoes[i]!;
    if (!mapTam.has(v.opcaoTamanhoId)) {
      return { fieldErrors: { [`variacao_${i}_tamanho`]: "Tamanho inválido." } };
    }
    if (gradeTamanhoId && mapGradeOpcao.get(v.opcaoTamanhoId) !== gradeTamanhoId) {
      return {
        fieldErrors: { [`variacao_${i}_tamanho`]: "A opção não pertence à grade selecionada." },
      };
    }
    if (!mapCor.has(v.corCatalogoId)) {
      return { fieldErrors: { [`variacao_${i}_cor`]: "Cor inválida." } };
    }
    const ean = emptyToUndefined(v.ean13?.replace(/\D/g, ""));
    if (ean != null && (!ean || ean.length !== 13 || !isValidEan13(ean))) {
      return {
        fieldErrors: { [`variacao_${i}_ean13`]: "EAN-13 inválido." },
      };
    }
  }

  try {
    const produtoId = await prisma.$transaction(async (tx) => {
      const base = {
        referencia: referencia ?? null,
        nome: data.nome,
        descricao: descricao ?? null,
        precoVenda,
        categoriaId: resolvedCategoriaId ?? null,
        subcategoriaId: subcategoriaId ?? null,
        tipoId: tipoId ?? null,
        colecaoId: colecaoId ?? null,
        gradeTamanhoId: gradeTamanhoId ?? null,
        isActive: data.isActive,
        ncm: ncm ?? null,
        cest: cest ?? null,
        origemMercadoria,
        unidadeTributavel: unidadeTributavel ?? null,
      };

      let pid: string;
      if (data.id) {
        const existing = await tx.produto.findFirst({
          where: { id: data.id, tenantId },
        });
        if (!existing) throw new Error("notfound");
        await tx.produto.update({
          where: { id: data.id },
          data: base,
        });
        pid = data.id;
      } else {
        const created = await tx.produto.create({
          data: { ...base, tenantId },
        });
        pid = created.id;
      }

      const finalVariacaoIds: string[] = [];

      for (let i = 0; i < data.variacoes.length; i++) {
        const v = data.variacoes[i]!;
        const ean = emptyToUndefined(v.ean13?.replace(/\D/g, ""));
        const codigoExterno = emptyToUndefined(v.codigoExterno?.trim());
        const nomeTam = mapTam.get(v.opcaoTamanhoId)!;
        const nomeCor = mapCor.get(v.corCatalogoId)!;
        const nome = formatNomeGrade(nomeTam, nomeCor);

        const row = {
          nome,
          opcaoTamanhoId: v.opcaoTamanhoId,
          corCatalogoId: v.corCatalogoId,
          ean13: ean ?? null,
          codigoExterno: codigoExterno ?? null,
          ordem: v.ordem ?? i,
        };

        if (v.id) {
          const ex = await tx.produtoVariacao.findFirst({
            where: { id: v.id, produtoId: pid, tenantId },
          });
          if (ex) {
            await tx.produtoVariacao.update({
              where: { id: v.id },
              data: row,
            });
            finalVariacaoIds.push(v.id);
            continue;
          }
        }

        const created = await tx.produtoVariacao.create({
          data: {
            ...row,
            tenantId,
            produtoId: pid,
          },
        });
        finalVariacaoIds.push(created.id);
      }

      if (finalVariacaoIds.length > 0) {
        await tx.produtoVariacao.deleteMany({
          where: {
            produtoId: pid,
            id: { notIn: finalVariacaoIds },
          },
        });
      }

      return pid;
    });

    revalidatePath("/admin/catalogo/produtos");
    revalidatePath(`/admin/catalogo/produtos/${produtoId}/edit`);
  } catch (e) {
    console.error(e);
    if (String(e).includes("Unique")) {
      return { error: "EAN-13 ou código externo duplicado para este tenant." };
    }
    return { error: "Não foi possível salvar o produto." };
  }

  redirect("/admin/catalogo/produtos");
}

export async function deleteProduto(formData: FormData): Promise<void> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") || "");
  if (!id) redirect("/admin/catalogo/produtos?e=id");

  const row = await prisma.produto.findFirst({ where: { id, tenantId } });
  if (!row) redirect("/admin/catalogo/produtos?e=nf");

  try {
    await prisma.produto.delete({ where: { id } });
    revalidatePath("/admin/catalogo/produtos");
  } catch (e) {
    console.error(e);
    redirect("/admin/catalogo/produtos?e=db");
  }
  redirect("/admin/catalogo/produtos");
}
