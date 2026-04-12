import { requireRole } from "@/lib/authorization";
import { upsertTipoProduto } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

export default async function NovoTipoPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <SimpleTaxonomyForm
      title="Novo tipo"
      description="Ex.: calça, camisa, vestido — usado para filtros e relatórios."
      backHref="/admin/catalogo/tipos"
      listLabel="Voltar para tipos"
      saveAction={upsertTipoProduto}
    />
  );
}
