import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertTipoProduto } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarTipoPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const row = await prisma.tipoProduto.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!row) notFound();

  return (
    <SimpleTaxonomyForm
      title="Editar tipo"
      description="Ajuste nome, slug ou ordem."
      backHref="/admin/catalogo/tipos"
      listLabel="Voltar para tipos"
      saveAction={upsertTipoProduto}
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
