"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";
import { flattenZodErrors } from "@/lib/form-utils";
import { clientePfSchema, clientePjSchema } from "@/modules/clientes/schemas/cliente-schemas";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";

export type ClienteActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

/** Verifica se o usuário da sessão tem acesso à loja informada. */
function hasStoreAccess(session: { user: { storeIds: string[] } }, storeId: string): boolean {
  return session.user.storeIds.includes(storeId);
}

export async function upsertClientePf(
  _prev: ClienteActionResult | null,
  formData: FormData,
): Promise<ClienteActionResult> {
  const session = await requireRole(ROLES_ACESSO_CLIENTES);

  const parsed = clientePfSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    storeId: String(formData.get("storeId") || ""),
    nome: String(formData.get("nome") || ""),
    cpf: String(formData.get("cpf") || ""),
    endereco: String(formData.get("endereco") || ""),
    telefone: String(formData.get("telefone") || ""),
    email: String(formData.get("email") || ""),
    aniversario: String(formData.get("aniversario") || ""),
    creditLimitConsignado: String(formData.get("creditLimitConsignado") || ""),
    corretorId: String(formData.get("corretorId") || ""),
    isActive: formData.get("isActive") === "on",
    isBlocked: formData.get("isBlocked") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const data = parsed.data;
  if (!hasStoreAccess(session, data.storeId)) {
    return { error: "Você não tem acesso a esta loja." };
  }

  let aniversario: Date | null = null;
  if (data.aniversario?.trim()) {
    const d = new Date(data.aniversario);
    if (!Number.isNaN(d.getTime())) aniversario = d;
  }

  const tenantId = session.user.tenantId;
  // schema (superRefine) já validou o campo; parseCreditLimitField é chamado aqui apenas para extrair o valor numérico
  const credit = parseCreditLimitField(data.creditLimitConsignado);
  const creditLimit = credit.ok && credit.value != null ? new Prisma.Decimal(credit.value) : null;

  try {
    if (data.id) {
      const existing = await prisma.cliente.findFirst({
        where: { id: data.id, tenantId, tipo: "PF" },
      });
      if (!existing || !hasStoreAccess(session, existing.storeId)) {
        return { error: "Cliente não encontrado." };
      }
      if (existing.storeId !== data.storeId) {
        return { error: "Não é permitido alterar a loja do cadastro." };
      }

      await prisma.cliente.update({
        where: { id: data.id },
        data: {
          nome: data.nome,
          cpf: data.cpf,
          endereco: data.endereco,
          telefone: data.telefone,
          email: data.email ?? null,
          aniversario,
          creditLimit,
          corretorId: data.corretorId ?? null,
          isActive: data.isActive,
          isBlocked: data.isBlocked,
        },
      });
    } else {
      await prisma.cliente.create({
        data: {
          tenantId,
          storeId: data.storeId,
          tipo: "PF",
          nome: data.nome,
          cpf: data.cpf,
          endereco: data.endereco,
          telefone: data.telefone,
          email: data.email ?? null,
          aniversario,
          creditLimit,
          corretorId: data.corretorId ?? null,
          isActive: data.isActive,
          isBlocked: data.isBlocked,
        },
      });
    }
  } catch {
    return { error: "Não foi possível salvar. Verifique os dados ou tente novamente." };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function upsertClientePj(
  _prev: ClienteActionResult | null,
  formData: FormData,
): Promise<ClienteActionResult> {
  const session = await requireRole(ROLES_ACESSO_CLIENTES);

  const parsed = clientePjSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    storeId: String(formData.get("storeId") || ""),
    fantasia: String(formData.get("fantasia") || ""),
    razaoSocial: String(formData.get("razaoSocial") || ""),
    cnpj: String(formData.get("cnpj") || ""),
    ie: String(formData.get("ie") || ""),
    ieIsento: formData.get("ieIsento") === "on",
    endereco: String(formData.get("endereco") || ""),
    telefone: String(formData.get("telefone") || ""),
    email: String(formData.get("email") || ""),
    responsavelNome: String(formData.get("responsavelNome") || ""),
    responsavelFone: String(formData.get("responsavelFone") || ""),
    creditLimitConsignado: String(formData.get("creditLimitConsignado") || ""),
    corretorId: String(formData.get("corretorId") || ""),
    isActive: formData.get("isActive") === "on",
    isBlocked: formData.get("isBlocked") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const data = parsed.data;
  if (!hasStoreAccess(session, data.storeId)) {
    return { error: "Você não tem acesso a esta loja." };
  }

  const tenantId = session.user.tenantId;
  // schema (superRefine) já validou o campo; parseCreditLimitField é chamado aqui apenas para extrair o valor numérico
  const credit = parseCreditLimitField(data.creditLimitConsignado);
  const creditLimit = credit.ok && credit.value != null ? new Prisma.Decimal(credit.value) : null;

  const ieValue = data.ieIsento ? null : data.ie ?? null;

  try {
    if (data.id) {
      const existing = await prisma.cliente.findFirst({
        where: { id: data.id, tenantId, tipo: "PJ" },
      });
      if (!existing || !hasStoreAccess(session, existing.storeId)) {
        return { error: "Cliente não encontrado." };
      }
      if (existing.storeId !== data.storeId) {
        return { error: "Não é permitido alterar a loja do cadastro." };
      }

      await prisma.cliente.update({
        where: { id: data.id },
        data: {
          fantasia: data.fantasia,
          razaoSocial: data.razaoSocial,
          cnpj: data.cnpj,
          ie: ieValue,
          ieIsento: data.ieIsento,
          endereco: data.endereco,
          telefone: data.telefone,
          email: data.email ?? null,
          responsavelNome: data.responsavelNome,
          responsavelFone: data.responsavelFone,
          creditLimit,
          corretorId: data.corretorId ?? null,
          isActive: data.isActive,
          isBlocked: data.isBlocked,
        },
      });
    } else {
      await prisma.cliente.create({
        data: {
          tenantId,
          storeId: data.storeId,
          tipo: "PJ",
          fantasia: data.fantasia,
          razaoSocial: data.razaoSocial,
          cnpj: data.cnpj,
          ie: ieValue,
          ieIsento: data.ieIsento,
          endereco: data.endereco,
          telefone: data.telefone,
          email: data.email ?? null,
          responsavelNome: data.responsavelNome,
          responsavelFone: data.responsavelFone,
          creditLimit,
          corretorId: data.corretorId ?? null,
          isActive: data.isActive,
          isBlocked: data.isBlocked,
        },
      });
    }
  } catch {
    return { error: "Não foi possível salvar. Verifique os dados ou tente novamente." };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function toggleClienteBlocked(formData: FormData) {
  const session = await requireRole(ROLES_ACESSO_CLIENTES);
  const id = String(formData.get("id") ?? "");
  const tenantId = session.user.tenantId;

  try {
    const row = await prisma.cliente.findFirst({ where: { id, tenantId } });
    if (!row || !hasStoreAccess(session, row.storeId)) return;

    await prisma.cliente.update({
      where: { id },
      data: { isBlocked: !row.isBlocked },
    });

    revalidatePath("/clientes");
  } catch {
    // falha silenciosa: o UI reflete o estado real do banco no próximo revalidate
  }
}
