"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";
import { clientePfSchema, clientePjSchema } from "@/modules/clientes/schemas/cliente-schemas";
import { ROLES_ACESSO_CLIENTES } from "@/modules/clientes/lib/roles";

export type ClienteActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

function flattenZod(err: import("zod").ZodError): Record<string, string> {
  const flat = err.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
  );
}

function assertStore(session: { user: { storeIds: string[] } }, storeId: string) {
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
    return { fieldErrors: flattenZod(parsed.error) };
  }

  const data = parsed.data;
  if (!assertStore(session, data.storeId)) {
    return { error: "Você não tem acesso a esta loja." };
  }

  const credit = parseCreditLimitField(data.creditLimitConsignado);
  if (!credit.ok) return { fieldErrors: { creditLimitConsignado: credit.message } };

  let aniversario: Date | null = null;
  if (data.aniversario?.trim()) {
    const d = new Date(data.aniversario);
    if (!Number.isNaN(d.getTime())) aniversario = d;
  }

  const tenantId = session.user.tenantId;
  const creditLimit =
    credit.value == null ? null : new Prisma.Decimal(credit.value);

  try {
    if (data.id) {
      const existing = await prisma.cliente.findFirst({
        where: { id: data.id, tenantId, tipo: "PF" },
      });
      if (!existing || !assertStore(session, existing.storeId)) {
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
    return { fieldErrors: flattenZod(parsed.error) };
  }

  const data = parsed.data;
  if (!assertStore(session, data.storeId)) {
    return { error: "Você não tem acesso a esta loja." };
  }

  const credit = parseCreditLimitField(data.creditLimitConsignado);
  if (!credit.ok) return { fieldErrors: { creditLimitConsignado: credit.message } };

  const tenantId = session.user.tenantId;
  const creditLimit =
    credit.value == null ? null : new Prisma.Decimal(credit.value);

  const ieValue = data.ieIsento ? null : data.ie ?? null;

  try {
    if (data.id) {
      const existing = await prisma.cliente.findFirst({
        where: { id: data.id, tenantId, tipo: "PJ" },
      });
      if (!existing || !assertStore(session, existing.storeId)) {
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

  const row = await prisma.cliente.findFirst({ where: { id, tenantId } });
  if (!row || !assertStore(session, row.storeId)) return;

  await prisma.cliente.update({
    where: { id },
    data: { isBlocked: !row.isBlocked },
  });

  revalidatePath("/clientes");
}
