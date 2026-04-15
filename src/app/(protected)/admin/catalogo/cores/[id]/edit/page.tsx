import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertCatalogoCor } from "@/modules/catalogo/actions/catalogo-tc-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarCorPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const row = await prisma.catalogoCor.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!row) notFound();

  return (
    <SimpleTaxonomyForm
      title="Editar cor"
      description="Ajuste nome, slug ou ordem."
      backHref="/admin/catalogo/cores"
      listLabel="Voltar para cores"
      saveAction={upsertCatalogoCor}
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
