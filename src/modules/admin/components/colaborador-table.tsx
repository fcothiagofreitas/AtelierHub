import { Pencil, Plus, UserX } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { roleLabels } from "@/lib/roles";
import {
  toggleColaboradorActive,
  resetColaboradorPassword,
} from "@/modules/admin/actions/colaborador-actions";
import { ConfirmActionButton } from "./confirm-action-button";
import type { UserRole } from "@prisma/client";

type ColaboradorRow = {
  id: string;
  name: string;
  cpf: string | null;
  role: UserRole;
  isActive: boolean;
  userId: string | null;
  stores: { store: { name: string } }[];
};

type ColaboradorTableProps = {
  colaboradores: ColaboradorRow[];
  search: string;
  resetOk: boolean;
};

export function ColaboradorTable({
  colaboradores,
  search,
  resetOk,
}: ColaboradorTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Colaboradores</h2>
          <p className="text-sm text-muted-foreground">
            {colaboradores.length}{" "}
            {colaboradores.length === 1 ? "pessoa" : "pessoas"}{" "}
            {search
              ? `encontrada${colaboradores.length !== 1 ? "s" : ""} para "${search}"`
              : "cadastradas"}
          </p>
        </div>
        <Link
          href="/admin/colaboradores/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          Novo colaborador
        </Link>
      </div>

      {resetOk && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          Senha redefinida com sucesso. O colaborador deve trocar no próximo acesso.
        </div>
      )}

      {colaboradores.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <UserX className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search
              ? "Nenhum colaborador encontrado"
              : "Nenhum colaborador cadastrado ainda"}
          </p>
          {!search && (
            <Link
              href="/admin/colaboradores/new"
              className={cn(
                buttonVariants({ variant: "link" }),
                "mt-2 text-sm",
              )}
            >
              Cadastrar primeiro colaborador
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Cargo</th>
                <th className="px-4 py-3 text-left font-medium">Lojas</th>
                <th className="px-4 py-3 text-left font-medium">Acesso</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {colaboradores.map((col) => (
                <tr
                  key={col.id}
                  className="bg-card hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{col.name}</p>
                    {col.cpf && (
                      <p className="text-xs text-muted-foreground">{col.cpf}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {roleLabels[col.role]}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {col.stores.map((s) => s.store.name).join(", ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={col.userId ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {col.userId ? "Com login" : "Sem login"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={col.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {col.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/colaboradores/${col.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                        )}
                      >
                        <Pencil className="size-4" />
                      </Link>

                      {col.userId && (
                        <ConfirmActionButton
                          title="Resetar senha"
                          description={`A senha de ${col.name} será redefinida para a senha padrão do sistema.`}
                          actionLabel="Resetar senha"
                          triggerLabel="Resetar senha"
                          triggerClassName="text-xs text-muted-foreground hover:text-foreground"
                          formAction={resetColaboradorPassword}
                          hiddenFields={{ id: col.id }}
                        />
                      )}

                      <ConfirmActionButton
                        title={col.isActive ? "Desativar colaborador" : "Ativar colaborador"}
                        description={
                          col.isActive
                            ? `${col.name} perderá acesso ao sistema e não aparecerá em seleções operacionais.`
                            : `${col.name} voltará a ter acesso e aparecerá nas listagens.`
                        }
                        actionLabel={col.isActive ? "Desativar" : "Ativar"}
                        triggerLabel={col.isActive ? "Desativar" : "Ativar"}
                        triggerClassName={
                          col.isActive
                            ? "text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            : "text-xs text-green-700 hover:bg-green-50"
                        }
                        actionClassName={
                          col.isActive
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : undefined
                        }
                        formAction={toggleColaboradorActive}
                        hiddenFields={{
                          id: col.id,
                          isActive: String(!col.isActive),
                        }}
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
