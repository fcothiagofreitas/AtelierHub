import { Pencil, Plus, UserX } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { roleLabels } from "@/lib/roles";
import {
  toggleUserActive,
  resetUserPassword,
} from "@/modules/admin/actions/user-actions";
import type { UserRole } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  stores: { store: { name: string } }[];
};

type UserTableProps = {
  users: UserRow[];
  search: string;
  resetOk: boolean;
};

export function UserTable({ users, search, resetOk }: UserTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "pessoa" : "pessoas"}{" "}
            {search
              ? `encontrada${users.length !== 1 ? "s" : ""} para "${search}"`
              : "com acesso ao sistema"}
          </p>
        </div>
        <Link
          href="/admin/usuarios/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          Novo usuário
        </Link>
      </div>

      {resetOk && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          Senha redefinida com sucesso. O usuário deve trocar no próximo acesso.
        </div>
      )}

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <UserX className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search
              ? "Nenhum usuário encontrado"
              : "Nenhum usuário cadastrado ainda"}
          </p>
          {!search && (
            <Link
              href="/admin/usuarios/new"
              className={cn(
                buttonVariants({ variant: "link" }),
                "mt-2 text-sm",
              )}
            >
              Criar primeiro usuário
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Usuário</th>
                <th className="px-4 py-3 text-left font-medium">Perfil</th>
                <th className="px-4 py-3 text-left font-medium">Lojas</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="bg-card hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {roleLabels[user.role]}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {user.stores.map((s) => s.store.name).join(", ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/usuarios/${user.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                        )}
                      >
                        <Pencil className="size-4" />
                      </Link>

                      <form action={resetUserPassword}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          title="Redefinir senha"
                        >
                          Resetar senha
                        </Button>
                      </form>

                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!user.isActive)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          type="submit"
                          className={
                            user.isActive
                              ? "text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              : "text-xs text-green-700 hover:bg-green-50"
                          }
                        >
                          {user.isActive ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
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
