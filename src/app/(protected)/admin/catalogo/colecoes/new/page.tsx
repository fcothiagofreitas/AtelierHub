import { requireRole } from "@/lib/authorization";
import { upsertColecaoProduto } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

export default async function NovaColecaoPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <SimpleTaxonomyForm
      title="Nova coleção"
      description="Campanhas, estações ou linhas comerciais."
      backHref="/admin/catalogo/colecoes"
      listLabel="Voltar para coleções"
      saveAction={upsertColecaoProduto}
    />
  );
}
