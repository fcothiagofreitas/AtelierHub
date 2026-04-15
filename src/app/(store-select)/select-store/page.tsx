import { Building2, Store } from "lucide-react";
import { redirect } from "next/navigation";
import { getActiveStoreContext } from "@/lib/session";
import { selectStore } from "@/modules/auth/actions/select-store";
import { cn } from "@/lib/utils";

export default async function SelectStorePage() {
  const { session, stores, activeStore } = await getActiveStoreContext();

  if (stores.length === 0) redirect("/login");
  if (stores.length === 1) redirect("/dashboard");

  const adminStores = stores.filter((s) => s.kind === "ADMINISTRATIVE");
  const opStores = stores.filter((s) => s.kind === "OPERATIONAL");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo + título */}
        <div className="text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AH
          </div>
          <h1 className="mt-4 text-xl font-semibold">Selecione a loja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Olá, {session.user.name?.split(" ")[0]}. Em qual unidade você vai
            operar agora?
          </p>
        </div>

        <div className="rounded-lg border bg-card p-2 shadow-sm space-y-1">
          {adminStores.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Administrativo
              </p>
              {adminStores.map((store) => (
                <StoreButton
                  key={store.id}
                  store={store}
                  isDefault={store.id === session.user.defaultStoreId}
                />
              ))}
            </>
          )}

          {opStores.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Lojas operacionais
              </p>
              {opStores.map((store) => (
                <StoreButton
                  key={store.id}
                  store={store}
                  isDefault={store.id === session.user.defaultStoreId}
                />
              ))}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Você pode trocar de loja a qualquer momento pelo cabeçalho.
        </p>
      </div>
    </div>
  );
}

function StoreButton({
  store,
  isDefault,
}: {
  store: { id: string; name: string; kind: string };
  isDefault: boolean;
}) {
  const Icon = store.kind === "ADMINISTRATIVE" ? Building2 : Store;

  return (
    <form action={selectStore}>
      <input type="hidden" name="storeId" value={store.id} />
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{store.name}</p>
          <p className="text-xs text-muted-foreground">
            {store.kind === "ADMINISTRATIVE"
              ? "Visão consolidada"
              : "Loja operacional"}
          </p>
        </div>
        {isDefault && (
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            Padrão
          </span>
        )}
      </button>
    </form>
  );
}
