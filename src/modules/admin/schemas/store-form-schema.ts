import { z } from "zod";

export const storeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nome obrigatorio."),
  slug: z.string().optional(),
  kind: z.enum(["ADMINISTRATIVE", "OPERATIONAL"]),
  isActive: z.boolean(),
});

export type StoreFormInput = z.infer<typeof storeFormSchema>;
