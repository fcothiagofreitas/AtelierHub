import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertSubcategoria } from "@/modules/catalogo/actions/taxonomy-actions";
import { SubcategoriaForm } from "@/modules/catalogo/components/subcategoria-form";

export default async function NovaSubcategoriaPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  const categorias = await prisma.categoriaProduto.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true },
  });

  return (
    <SubcategoriaForm categorias={categorias} saveAction={upsertSubcategoria} defaults={null} />
  );
}
