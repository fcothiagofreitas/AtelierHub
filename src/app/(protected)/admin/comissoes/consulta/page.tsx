import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listLancamentosComissao } from "@/modules/comissoes/comissoes-queries";
import { ComissoesConsultaFilters } from "@/modules/comissoes/components/comissoes-consulta-filters";
import { ComissoesLancamentosTable } from "@/modules/comissoes/components/comissoes-lancamentos-table";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminComissoesConsultaPage({ searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const params = searchParams ? await searchParams : {};

  const deParam = typeof params.de === "string" ? params.de : undefined;
  const ateParam = typeof params.ate === "string" ? params.ate : undefined;
  const colaboradorId =
    typeof params.colaboradorId === "string" ? params.colaboradorId : undefined;
  const corretorId = typeof params.corretorId === "string" ? params.corretorId : undefined;

  const defaultDe = deParam ?? format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  const defaultAte = ateParam ?? format(new Date(), "yyyy-MM-dd");

  const [rows, colaboradores, corretores] = await Promise.all([
    listLancamentosComissao(session.user.tenantId, {
      de: deParam ?? null,
      ate: ateParam ?? null,
      colaboradorId: colaboradorId ?? null,
      corretorId: corretorId ?? null,
    }),
    prisma.colaborador.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.corretor.findMany({
      where: { tenantId: session.user.tenantId, isActive: true, isBlocked: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/comissoes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 mb-2 text-muted-foreground",
          )}
        >
          <ArrowLeft className="size-4" />
          Comissões
        </Link>
        <h2 className="text-xl font-semibold">Lançamentos de comissão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registos criados automaticamente na quitação do pedido.
        </p>
      </div>

      <ComissoesConsultaFilters
        colaboradores={colaboradores}
        corretores={corretores}
        defaultDe={defaultDe}
        defaultAte={defaultAte}
        defaultColaboradorId={colaboradorId ?? ""}
        defaultCorretorId={corretorId ?? ""}
      />

      <ComissoesLancamentosTable rows={rows} />
    </div>
  );
}
