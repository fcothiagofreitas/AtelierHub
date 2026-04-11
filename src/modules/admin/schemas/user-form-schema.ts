import { z } from "zod";

export const userFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome obrigatório"),
    email: z.string().email("E-mail inválido"),
    role: z.enum(["ADMIN_DA_MARCA", "ADMINISTRATIVO", "GERENTE_LOJA", "VENDEDOR"]),
    isActive: z.boolean().default(true),
    password: z.string().optional(),
    storeIds: z.array(z.string()).min(1, "Selecione ao menos uma loja"),
    defaultStoreId: z.string().min(1, "Escolha a loja padrão"),
  })
  .superRefine((val, ctx) => {
    if (!val.id && (!val.password || val.password.length < 8)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Senha deve ter ao menos 8 caracteres",
      });
    }
    if (val.storeIds.length > 0 && !val.storeIds.includes(val.defaultStoreId)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultStoreId"],
        message: "A loja padrão deve estar entre as lojas selecionadas",
      });
    }
  });

export type UserFormInput = z.infer<typeof userFormSchema>;
