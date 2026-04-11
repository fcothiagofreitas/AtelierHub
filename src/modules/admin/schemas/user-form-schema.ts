import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";

export const userFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome obrigatorio."),
    email: z.string().email("E-mail invalido."),
    role: z.nativeEnum(UserRole),
    isActive: z.boolean(),
    password: z.string().optional(),
    storeIds: z.array(z.string()).min(1, "Selecione ao menos uma loja."),
    defaultStoreId: z.string().min(1, "Escolha a loja padrao."),
  })
  .superRefine((value, ctx) => {
    if (!value.id && (!value.password || value.password.length < 8)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Senha inicial deve ter pelo menos 8 caracteres.",
      });
    }

    if (!value.storeIds.includes(value.defaultStoreId)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultStoreId"],
        message: "A loja padrao precisa estar entre as lojas liberadas.",
      });
    }
  });

export type UserFormInput = z.infer<typeof userFormSchema>;
