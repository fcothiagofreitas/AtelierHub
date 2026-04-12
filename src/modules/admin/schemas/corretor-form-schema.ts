import { z } from "zod";
import { CorretorPaymentMethod } from "@prisma/client";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";

const paymentMethods = [
  CorretorPaymentMethod.PIX,
  CorretorPaymentMethod.CASH,
  CorretorPaymentMethod.BANK_TRANSFER,
] as const;

function emptyToUndefined(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t === "" ? undefined : t;
}

export function parseCreditLimitConsignado(raw: string | undefined) {
  return parseCreditLimitField(raw);
}

export const corretorFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Informe o nome"),
    document: z.string().optional().transform(emptyToUndefined),
    email: z.string().optional().transform(emptyToUndefined),
    phone: z.string().optional().transform(emptyToUndefined),
    commissionPercent: z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100"),
    paymentMethod: z.enum(paymentMethods),
    pixKey: z.string().optional().transform(emptyToUndefined),
    bankName: z.string().optional().transform(emptyToUndefined),
    bankBranch: z.string().optional().transform(emptyToUndefined),
    bankAccount: z.string().optional().transform(emptyToUndefined),
    notes: z.string().optional().transform(emptyToUndefined),
    creditLimitConsignado: z.string().optional(),
    isActive: z.boolean(),
    isBlocked: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.email) {
      const r = z.string().email().safeParse(data.email);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "E-mail inválido",
          path: ["email"],
        });
      }
    }
    const parsed = parseCreditLimitConsignado(data.creditLimitConsignado);
    if (!parsed.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.message,
        path: ["creditLimitConsignado"],
      });
    }
  });
