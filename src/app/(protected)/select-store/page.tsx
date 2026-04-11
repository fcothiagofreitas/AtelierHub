import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActiveStoreContext } from "@/lib/session";
import { selectStore } from "@/modules/auth/actions/select-store";

export default async function SelectStorePage() {
  const { stores, activeStore } = await getActiveStoreContext();

  if (stores.length === 0) redirect("/login");
  if (stores.length === 1) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AH
          </div>
          <h1 className="mt-4 text-xl font-semibold">Selecione a loja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha em qual unidade você vai operar agora.
          </p>
        </div>

        <div className="space-y-2">
          {stores.map((store) => (
            <form key={store.id} action={selectStore}>
              <input type="hidden" name="storeId" value={store.id} />
              <Button
                type="submit"
                variant={activeStore?.id === store.id ? "default" : "outline"}
                className="w-full justify-start gap-3 text-left"
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium">{store.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {store.kind === "ADMINISTRATIVE"
                      ? "Loja administrativa"
                      : "Loja operacional"}
                  </span>
                </span>
              </Button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
