import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertCategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarCategoriaPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const row = await prisma.categoriaProduto.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!row) notFound();

  return (
    <SimpleTaxonomyForm
      title="Editar categoria"
      description="Altere nome, slug ou ordem de exibição."
      backHref="/admin/catalogo/categorias"
      listLabel="Voltar para categorias"
      saveAction={upsertCategoria}
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
