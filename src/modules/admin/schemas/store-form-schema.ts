import { z } from "zod";

export const storeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nome obrigatório"),
  kind: z.enum(["ADMINISTRATIVE", "OPERATIONAL"]),
  isActive: z.boolean().default(true),
});

export type StoreFormInput = z.infer<typeof storeFormSchema>;
