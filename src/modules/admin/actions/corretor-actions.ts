"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { corretorFormSchema } from "@/modules/admin/schemas/corretor-form-schema";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";

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
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
      ),
    };
  }

  const credit = parseCreditLimitField(parsed.data.creditLimitConsignado);
  if (!credit.ok) {
    return { fieldErrors: { creditLimitConsignado: credit.message } };
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

  const creditLimitConsignado =
    credit.value == null ? null : new Prisma.Decimal(credit.value);

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

  const row = await prisma.corretor.findFirst({ where: { id, tenantId } });
  if (!row) return;

  await prisma.corretor.update({
    where: { id },
    data: { isBlocked: !row.isBlocked },
  });

  revalidatePath("/admin/corretores");
  revalidatePath("/admin");
}
