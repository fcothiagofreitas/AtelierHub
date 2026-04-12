import { z } from "zod";
import { parseCreditLimitField } from "@/lib/parse-credit-limit";
import { emptyToUndefined } from "@/lib/form-utils";
import { isValidCpf, isValidCnpj } from "@/lib/doc-validation";

const cpfDigits = z.preprocess(
  (v) => String(v ?? "").replace(/\D/g, "").slice(0, 11),
  z
    .string()
    .length(11, "CPF deve ter 11 dígitos")
    .refine(isValidCpf, "CPF inválido"),
);

const cnpjDigits = z.preprocess(
  (v) => String(v ?? "").replace(/\D/g, "").slice(0, 14),
  z
    .string()
    .length(14, "CNPJ deve ter 14 dígitos")
    .refine(isValidCnpj, "CNPJ inválido"),
);

export const clientePfSchema = z
  .object({
    id: z.string().optional(),
    storeId: z.string().min(1),
    nome: z.string().min(2, "Informe o nome"),
    cpf: cpfDigits,
    endereco: z.string().min(3, "Informe o endereço"),
    telefone: z.string().min(8, "Informe o telefone"),
    email: z.string().optional().transform(emptyToUndefined),
    aniversario: z.string().optional().transform(emptyToUndefined),
    creditLimitConsignado: z.string().optional(),
    corretorId: z.string().optional().transform(emptyToUndefined),
    isActive: z.boolean(),
    isBlocked: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.email) {
      const r = z.string().email().safeParse(data.email);
      if (!r.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "E-mail inválido", path: ["email"] });
      }
    }
    const cr = parseCreditLimitField(data.creditLimitConsignado);
    if (!cr.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: cr.message,
        path: ["creditLimitConsignado"],
      });
    }
  });

export const clientePjSchema = z
  .object({
    id: z.string().optional(),
    storeId: z.string().min(1),
    fantasia: z.string().min(2, "Informe o nome fantasia"),
    razaoSocial: z.string().min(2, "Informe a razão social"),
    cnpj: cnpjDigits,
    ie: z.string().optional().transform(emptyToUndefined),
    ieIsento: z.boolean(),
    endereco: z.string().min(3, "Informe o endereço"),
    telefone: z.string().min(8, "Informe o telefone"),
    email: z.string().optional().transform(emptyToUndefined),
    responsavelNome: z.string().min(2, "Informe o responsável"),
    responsavelFone: z.string().min(8, "Informe o telefone do responsável"),
    creditLimitConsignado: z.string().optional(),
    corretorId: z.string().optional().transform(emptyToUndefined),
    isActive: z.boolean(),
    isBlocked: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.email) {
      const r = z.string().email().safeParse(data.email);
      if (!r.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "E-mail inválido", path: ["email"] });
      }
    }
    if (!data.ieIsento && !data.ie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a inscrição estadual ou marque isento",
        path: ["ie"],
      });
    }
    const cr = parseCreditLimitField(data.creditLimitConsignado);
    if (!cr.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: cr.message,
        path: ["creditLimitConsignado"],
      });
    }
  });
