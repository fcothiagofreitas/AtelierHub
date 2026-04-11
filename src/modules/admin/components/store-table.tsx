import { Building2, Pencil, Plus, Store } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteStoreButton } from "./delete-store-button";

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
  isActive: boolean;
  _count: { colaboradorAccess: number };
};

type StoreTableProps = {
  stores: StoreRow[];
  search: string;
};

export function StoreTable({ stores, search }: StoreTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Lojas</h2>
          <p className="text-sm text-muted-foreground">
            {stores.length} {stores.length === 1 ? "unidade" : "unidades"}{" "}
            {search
              ? `encontrada${stores.length !== 1 ? "s" : ""} para "${search}"`
              : "cadastradas"}
          </p>
        </div>
        <Link
          href="/admin/lojas/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          Nova loja
        </Link>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Store className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "Nenhuma loja encontrada" : "Nenhuma loja cadastrada ainda"}
          </p>
          {!search && (
            <Link
              href="/admin/lojas/new"
              className={cn(
                buttonVariants({ variant: "link" }),
                "mt-2 text-sm",
              )}
            >
              Criar primeira loja
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Loja</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Usuários</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stores.map((store) => (
                <tr
                  key={store.id}
                  className="bg-card hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded bg-muted">
                        {store.kind === "ADMINISTRATIVE" ? (
                          <Building2 className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Store className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">{store.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {store.kind === "ADMINISTRATIVE"
                      ? "Administrativa"
                      : "Operacional"}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {store.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {store._count.colaboradorAccess}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={store.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {store.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/lojas/${store.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                        )}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <DeleteStoreButton
                        storeId={store.id}
                        storeName={store.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
