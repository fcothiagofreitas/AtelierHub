import { z } from "zod";

export const colaboradorFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome obrigatório"),
    cpf: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(["ADMIN_DA_MARCA", "ADMINISTRATIVO", "GERENTE_LOJA", "VENDEDOR"]),
    minCommission: z.coerce.number().min(0).max(100).default(0),
    admissionAt: z.string().optional(),
    isActive: z.boolean().default(true),
    storeIds: z.array(z.string()).min(1, "Selecione ao menos uma loja"),
    defaultStoreId: z.string().min(1, "Escolha a loja padrão"),

    // Acesso ao sistema — preenchido apenas quando o toggle estiver ativo
    hasSystemAccess: z.boolean().default(false),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.storeIds.length > 0 && !val.storeIds.includes(val.defaultStoreId)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultStoreId"],
        message: "A loja padrão deve estar entre as lojas selecionadas",
      });
    }

    if (val.hasSystemAccess) {
      if (!val.email || !z.string().email().safeParse(val.email).success) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "E-mail válido é obrigatório para acesso ao sistema",
        });
      }
      if (!val.id && (!val.password || val.password.length < 8)) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Senha deve ter ao menos 8 caracteres",
        });
      }
    }
  });

export type ColaboradorFormInput = z.infer<typeof colaboradorFormSchema>;
