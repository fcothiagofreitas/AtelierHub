import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertSubcategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { SubcategoriaForm } from "@/modules/catalogo/components/subcategoria-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditarSubcategoriaPage({ params }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;

  const row = await prisma.subcategoriaProduto.findFirst({
    where: { id, categoria: { tenantId: session.user.tenantId } },
  });
  if (!row) notFound();

  const categorias = await prisma.categoriaProduto.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <SubcategoriaForm
      categorias={categorias}
      saveAction={upsertSubcategoria}
      defaults={{
        id: row.id,
        categoriaId: row.categoriaId,
        nome: row.nome,
        slug: row.slug,
        ordem: row.ordem,
        isActive: row.isActive,
      }}
    />
  );
}
