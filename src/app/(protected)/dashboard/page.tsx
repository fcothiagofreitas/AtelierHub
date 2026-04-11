import { getActiveStoreContext } from "@/lib/session";
import { roleLabels } from "@/lib/authorization";

export default async function DashboardPage() {
  const { session, activeStore } = await getActiveStoreContext();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {roleLabels[session.user.role]} ·{" "}
          <span className="font-medium text-foreground">
            {activeStore?.name ?? "Nenhuma loja"}
          </span>
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {activeStore?.kind === "ADMINISTRATIVE"
            ? "Visão consolidada"
            : `Operação — ${activeStore?.name ?? ""}`}
        </h2>
      </div>

      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Dashboard em construção — Sprint 2 começa aqui.
        </p>
      </div>
    </div>
  );
}
