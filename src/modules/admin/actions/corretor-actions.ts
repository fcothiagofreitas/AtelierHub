"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";
import { flattenZodErrors } from "@/lib/form-utils";
import { corretorFormSchema } from "@/modules/admin/schemas/corretor-form-schema";

export type CorretorActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ALLOWED: ["ADMIN_DA_MARCA", "ADMINISTRATIVO"] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
];

export async function upsertCorretor(
  _prev: CorretorActionResult | null,
  formData: FormData,
): Promise<CorretorActionResult> {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;

  const parsed = corretorFormSchema.safeParse({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    document: String(formData.get("document") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    commissionPercent: formData.get("commissionPercent") ?? 0,
    paymentMethod: String(formData.get("paymentMethod") || "PIX"),
    pixKey: String(formData.get("pixKey") || ""),
    bankName: String(formData.get("bankName") || ""),
    bankBranch: String(formData.get("bankBranch") || ""),
    bankAccount: String(formData.get("bankAccount") || ""),
    notes: String(formData.get("notes") || ""),
    creditLimitConsignado: String(formData.get("creditLimitConsignado") || ""),
    isActive: formData.get("isActive") === "on",
    isBlocked: formData.get("isBlocked") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const {
    id,
    name,
    document,
    email,
    phone,
    commissionPercent,
    paymentMethod,
    pixKey,
    bankName,
    bankBranch,
    bankAccount,
    notes,
    isActive,
    isBlocked,
  } = parsed.data;

  // schema (superRefine) já validou o campo; parseCreditLimitField é chamado aqui apenas para extrair o valor numérico
  const credit = parseCreditLimitField(parsed.data.creditLimitConsignado);
  const creditLimitConsignado =
    credit.ok && credit.value != null ? new Prisma.Decimal(credit.value) : null;

  let dbError: string | null = null;

  try {
    if (id) {
      const existing = await prisma.corretor.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return { error: "Corretor não encontrado." };
      }
      await prisma.corretor.update({
        where: { id },
        data: {
          name,
          document,
          email,
          phone,
          commissionPercent,
          paymentMethod,
          pixKey,
          bankName,
          bankBranch,
          bankAccount,
          notes,
          creditLimitConsignado,
          isActive,
          isBlocked,
        },
      });
    } else {
      await prisma.corretor.create({
        data: {
          tenantId,
          name,
          document,
          email,
          phone,
          commissionPercent,
          paymentMethod,
          pixKey,
          bankName,
          bankBranch,
          bankAccount,
          notes,
          creditLimitConsignado,
          isActive,
          isBlocked,
        },
      });
    }
  } catch {
    dbError = "Não foi possível salvar. Tente novamente.";
  }

  if (dbError) return { error: dbError };

  revalidatePath("/admin/corretores");
  revalidatePath("/admin");
  redirect("/admin/corretores");
}

export async function toggleCorretorBlocked(formData: FormData) {
  const session = await requireRole(ALLOWED);
  const tenantId = session.user.tenantId;
  const id = String(formData.get("id") ?? "");

  try {
    const row = await prisma.corretor.findFirst({ where: { id, tenantId } });
    if (!row) return;

    await prisma.corretor.update({
      where: { id },
      data: { isBlocked: !row.isBlocked },
    });

    revalidatePath("/admin/corretores");
    revalidatePath("/admin");
  } catch {
    // falha silenciosa: o UI reflete o estado real do banco no próximo revalidate
  }
}
