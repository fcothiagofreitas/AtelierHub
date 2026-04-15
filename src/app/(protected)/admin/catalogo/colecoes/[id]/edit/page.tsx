import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertColecaoProduto } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarColecaoPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const row = await prisma.colecaoProduto.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!row) notFound();

  return (
    <SimpleTaxonomyForm
      title="Editar coleção"
      description="Ajuste nome, slug ou ordem."
      backHref="/admin/catalogo/colecoes"
      listLabel="Voltar para coleções"
      saveAction={upsertColecaoProduto}
      defaults={{
        id: row.id,
        nome: row.nome,
        slug: row.slug,
        ordem: row.ordem,
        isActive: row.isActive,
      }}
    />
  );
}
