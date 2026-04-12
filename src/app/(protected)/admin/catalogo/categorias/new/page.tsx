import { requireRole } from "@/lib/authorization";
import { upsertCategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

export default async function NovaCategoriaPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <SimpleTaxonomyForm
      title="Nova categoria"
      description="Nome exibido nas listagens e filtros de produto."
      backHref="/admin/catalogo/categorias"
      listLabel="Voltar para categorias"
      saveAction={upsertCategoria}
    />
  );
}
