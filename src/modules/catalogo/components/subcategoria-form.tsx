"use client";

import { Label } from "@/components/ui/label";
import type { TaxonomyActionResult } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "./simple-taxonomy-form";

type Cat = { id: string; nome: string };

type Props = {
  categorias: Cat[];
  saveAction: (
    prev: TaxonomyActionResult | null,
    formData: FormData,
  ) => Promise<TaxonomyActionResult>;
  defaults?: {
    id?: string;
    categoriaId: string;
    nome: string;
    slug: string;
    ordem: number;
    isActive: boolean;
  } | null;
};

export function SubcategoriaForm({ categorias, saveAction, defaults }: Props) {
  return (
    <SimpleTaxonomyForm
      title={defaults?.id ? "Editar subcategoria" : "Nova subcategoria"}
      description="Agrupe produtos dentro de uma categoria."
      backHref="/admin/catalogo/subcategorias"
      listLabel="Voltar para subcategorias"
      saveAction={saveAction}
      defaults={
        defaults
          ? {
              id: defaults.id,
              nome: defaults.nome,
              slug: defaults.slug,
              ordem: defaults.ordem,
              isActive: defaults.isActive,
            }
          : null
      }
      extraFields={
        <div className="space-y-1.5">
          <Label htmlFor="categoriaId">Categoria</Label>
          <select
            id="categoriaId"
            name="categoriaId"
            required
            defaultValue={defaults?.categoriaId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent ps-3 pe-10 py-1 text-sm shadow-sm"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      }
    />
  );
}
