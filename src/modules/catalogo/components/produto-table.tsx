import { Layers, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmActionButton } from "@/modules/admin/components/confirm-action-button";

type Row = {
  id: string;
  nome: string;
  isActive: boolean;
  categoriaNome: string | null;
  variacoesCount: number;
};

type Props = {
  produtos: Row[];
  search: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function ProdutoTable({ produtos, search, deleteAction }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
            {search ? ` para “${search}”` : ""}
          </p>
        </div>
        <Link href="/admin/catalogo/produtos/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" />
          Novo produto
        </Link>
      </div>

      {produtos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Layers className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhum produto encontrado." : "Nenhum produto cadastrado ainda."}
          </p>
          {!search && (
            <Link
              href="/admin/catalogo/produtos/new"
              className={cn(buttonVariants({ variant: "link" }), "mt-2 text-sm")}
            >
              Cadastrar primeiro produto
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-left font-medium">Variações</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {produtos.map((p) => (
                <tr key={p.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.categoriaNome ?? "—"}
                  </td>
                  <td className="px-4 py-3">{p.variacoesCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? "secondary" : "outline"}>
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/catalogo/produtos/${p.id}/edit`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ConfirmActionButton
                        title="Excluir produto?"
                        description="Todas as variações serão removidas."
                        actionLabel="Excluir"
                        triggerLabel="Excluir"
                        triggerClassName="text-destructive"
                        formAction={deleteAction}
                        hiddenFields={{ id: p.id }}
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
