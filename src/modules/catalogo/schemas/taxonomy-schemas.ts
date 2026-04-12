import { z } from "zod";
import { emptyToUndefined } from "@/lib/form-utils";
import { slugifyPt } from "@/lib/slug";

const nome = z.string().trim().min(1, "Informe o nome.");
const ordem = z.coerce.number().int().min(0).default(0);
const isActive = z.boolean().default(true);

export const categoriaFormSchema = z.object({
  id: z.string().optional(),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

export const subcategoriaFormSchema = z.object({
  id: z.string().optional(),
  categoriaId: z.string().min(1, "Selecione a categoria."),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

export const tipoFormSchema = z.object({
  id: z.string().optional(),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

export const colecaoFormSchema = z.object({
  id: z.string().optional(),
  nome,
  slug: z.string().optional(),
  ordem,
  isActive,
});

function resolveSlugInput(raw: string | undefined, nome: string): string {
  const t = emptyToUndefined(raw);
  return t ? slugifyPt(t) : slugifyPt(nome);
}

export function resolveCategoriaSlug(data: z.infer<typeof categoriaFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}

export function resolveSubcategoriaSlug(data: z.infer<typeof subcategoriaFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}

export function resolveTipoSlug(data: z.infer<typeof tipoFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}

export function resolveColecaoSlug(data: z.infer<typeof colecaoFormSchema>): string {
  return resolveSlugInput(data.slug, data.nome);
}
