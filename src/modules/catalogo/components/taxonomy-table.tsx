import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmActionButton } from "@/modules/admin/components/confirm-action-button";

export type TaxonomyRow = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  isActive: boolean;
  subtitle?: string;
};

type TaxonomyTableProps = {
  title: string;
  rows: TaxonomyRow[];
  search: string;
  newHref: string;
  editHref: (id: string) => string;
  emptyHint: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function TaxonomyTable({
  title,
  rows,
  search,
  newHref,
  editHref,
  emptyHint,
  deleteAction,
}: TaxonomyTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "registro" : "registros"}
            {search ? ` para “${search}”` : ""}
          </p>
        </div>
        <Link href={newHref} className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" />
          Novo
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Ordem</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.nome}</p>
                    {r.subtitle && (
                      <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.slug}</td>
                  <td className="px-4 py-3">{r.ordem}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.isActive ? "secondary" : "outline"}>
                      {r.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={editHref(r.id)}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ConfirmActionButton
                        title="Excluir registro?"
                        description="Esta ação não pode ser desfeita."
                        actionLabel="Excluir"
                        triggerLabel="Excluir"
                        triggerClassName="text-destructive"
                        formAction={deleteAction}
                        hiddenFields={{ id: r.id }}
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
