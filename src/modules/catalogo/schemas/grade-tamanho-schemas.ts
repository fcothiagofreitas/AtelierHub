import { z } from "zod";
import { emptyToUndefined } from "@/lib/form-utils";
import { slugifyPt } from "@/lib/slug";

const nome = z.string().trim().min(1, "Informe o nome.");
const ordem = z.coerce.number().int().min(0).default(0);
const isActive = z.boolean().default(true);

/** Grade (conjunto: letras, numérico, etc.). */
export const gradeTamanhoFormSchema = z.object({
  id: z.string().optional(),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

/** Opção dentro da grade (P, GG, 38…). */
export const opcaoTamanhoFormSchema = z.object({
  id: z.string().optional(),
  gradeTamanhoId: z.string().min(1, "Grade inválida."),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

function resolveSlugInput(raw: string | undefined, n: string): string {
  const t = emptyToUndefined(raw);
  return t ? slugifyPt(t) : slugifyPt(n);
}

export function resolveGradeTamanhoSlug(data: z.infer<typeof gradeTamanhoFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}

export function resolveOpcaoTamanhoSlug(data: z.infer<typeof opcaoTamanhoFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}
