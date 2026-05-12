import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLES_ACESSO_VENDAS } from "@/modules/vendas/lib/roles";
import { listarTrocas } from "@/modules/trocas/troca-queries";
import { TrocasTable } from "@/modules/trocas/components/trocas-table";
import type { TrocaEstado } from "@prisma/client";
import { Plus } from "lucide-react";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrocasPage({ searchParams }: Props) {
  await requireRole(ROLES_ACESSO_VENDAS);
  const { activeStore } = await getActiveStoreContext();
  if (!activeStore) redirect("/dashboard");

  const raw = searchParams ? await searchParams : {};
  const estadoParam = typeof raw.estado === "string" ? (raw.estado as TrocaEstado) : undefined;

  const result = await listarTrocas({
    storeId: activeStore.id,
    estado: estadoParam,
    take: 40,
  });

  const trocas = "error" in result ? [] : result.rows;
  const total = "error" in result ? 0 : result.total;

  return (
    <div className="container max-w-7xl space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trocas</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "troca" : "trocas"} registadas
          </p>
        </div>
        <Link
          href="/trocas/nova"
          className={cn(buttonVariants(), "gap-2")}
        >
          <Plus className="size-4" />
          Nova troca
        </Link>
      </div>

      {/* Estado filter */}
      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            { label: "Todas", value: undefined },
            { label: "Em andamento", value: "EM_ANDAMENTO" },
            { label: "Concluídas", value: "CONCLUIDA" },
            { label: "Canceladas", value: "CANCELADA" },
          ] as { label: string; value: TrocaEstado | undefined }[]
        ).map((opt) => {
          const active = estadoParam === opt.value;
          const href = opt.value ? `/trocas?estado=${opt.value}` : "/trocas";
          return (
            <Link
              key={opt.label}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/60",
              )}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      <TrocasTable trocas={trocas} />
    </div>
  );
}
