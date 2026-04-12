import { z } from "zod";
import { emptyToUndefined } from "@/lib/form-utils";
import { slugifyPt } from "@/lib/slug";

const nome = z.string().trim().min(1, "Informe o nome.");
const ordem = z.coerce.number().int().min(0).default(0);
const isActive = z.boolean().default(true);

export const catalogoCorFormSchema = z.object({
  id: z.string().optional(),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

function resolveSlugInput(raw: string | undefined, n: string): string {
  const t = emptyToUndefined(raw);
  return t ? slugifyPt(t) : slugifyPt(n);
}

export function resolveCatalogoCorSlug(data: z.infer<typeof catalogoCorFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}
