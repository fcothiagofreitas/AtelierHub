import { AlertTriangle, Building2, ShoppingBag, Users } from "lucide-react";
import { getActiveStoreContext } from "@/lib/session";
import { roleLabels } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { session, activeStore, stores } = await getActiveStoreContext();
  const params = searchParams ? await searchParams : {};
  const accessDenied = params.denied === "1";

  const isAdmin = ["ADMIN_DA_MARCA", "ADMINISTRATIVO"].includes(
    session.user.role,
  );

  const [storeCount, userCount] = isAdmin
    ? await Promise.all([
        prisma.store.count({ where: { tenantId: session.user.tenantId } }),
        prisma.user.count({ where: { tenantId: session.user.tenantId, isActive: true } }),
      ])
    : [null, null];

  return (
    <div className="space-y-6">
      {accessDenied && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Essa área exige outro perfil. Você permanece na operação atual.
          </p>
        </div>
      )}

      {/* Context header */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {roleLabels[session.user.role]}
              </p>
              <Badge variant="outline" className="text-[11px]">
                {activeStore?.kind === "ADMINISTRATIVE"
                  ? "Loja administrativa"
                  : "Loja operacional"}
              </Badge>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {activeStore?.kind === "ADMINISTRATIVE"
                ? "Visão consolidada da marca"
                : `Operação — ${activeStore?.name ?? ""}`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeStore?.kind === "ADMINISTRATIVE"
                ? "Acompanhe o desempenho e pendências de todas as lojas."
                : "Acompanhe vendas, estoque e pendências desta unidade."}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Lojas acessíveis
            </p>
            <p className="mt-1 text-2xl font-semibold">{stores.length}</p>
          </div>
        </div>
      </div>

      {/* Admin summary cards */}
      {isAdmin && storeCount !== null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            icon={Building2}
            label="Lojas ativas"
            value={storeCount}
            description="Unidades cadastradas na marca"
          />
          <SummaryCard
            icon={Users}
            label="Usuários ativos"
            value={userCount ?? 0}
            description="Pessoas com acesso ao sistema"
          />
          <SummaryCard
            icon={ShoppingBag}
            label="Vendas hoje"
            value="—"
            description="Disponível na Sprint 8"
            muted
          />
        </div>
      )}

      {/* Operational placeholder */}
      {!isAdmin && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Módulos operacionais chegam na Sprint 8
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vendas, estoque e PDV estarão disponíveis em breve.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  muted,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  description: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>
      <p className={`mt-4 text-sm ${muted ? "text-muted-foreground" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
