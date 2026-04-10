import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido").trim().toLowerCase(),
  password: z.string().min(8, "Informe sua senha com pelo menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
