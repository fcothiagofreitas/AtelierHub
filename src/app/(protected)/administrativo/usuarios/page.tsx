import Link from "next/link";
import { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabels, requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  resetUserPassword,
  upsertUser,
} from "@/modules/admin/actions/user-actions";

type UsuariosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsuariosPage({
  searchParams,
}: UsuariosPageProps) {
  const session = await requireRole([
    UserRole.ADMIN_DA_MARCA,
    UserRole.ADMINISTRATIVO,
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const editId =
    typeof resolvedSearchParams?.edit === "string" ? resolvedSearchParams.edit : "";

  const [users, stores] = await Promise.all([
    prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId ?? "",
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        stores: {
          include: { store: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.store.findMany({
      where: { tenantId: session.user.tenantId ?? "", isActive: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
  ]);

  const userBeingEdited = users.find((user) => user.id === editId) ?? null;
  const selectedStoreIds = userBeingEdited?.stores.map((item) => item.storeId) ?? [];
  const selectedDefaultStoreId =
    userBeingEdited?.stores.find((item) => item.isDefault)?.storeId ??
    selectedStoreIds[0] ??
    "";

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Usuarios
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Defina perfil, lojas liberadas e a operacao padrao de cada usuario.
            </p>
          </div>

          <form className="flex w-full max-w-sm gap-2" action="/administrativo/usuarios">
            <Input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome ou e-mail"
              className="h-10 rounded-md border-slate-200 bg-slate-50"
            />
            <Button type="submit" variant="outline" className="h-10 rounded-md">
              Filtrar
            </Button>
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Lojas</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-slate-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {roleLabels[user.role]}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.stores.map((store) => store.store.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-md px-2 py-1 text-xs font-medium",
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {user.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/administrativo/usuarios?edit=${user.id}`}
                        className="text-sm font-medium text-sky-700 hover:text-sky-800"
                      >
                        Editar
                      </Link>
                      <form action={resetUserPassword}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                          Resetar senha
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            {userBeingEdited ? "Editar usuario" : "Novo usuario"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Crie acessos internos e defina quais lojas cada pessoa pode operar.
          </p>
        </div>

        <form action={upsertUser} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={userBeingEdited?.id ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
              name="name"
              defaultValue={userBeingEdited?.name ?? ""}
              placeholder="Ex.: Camila Rocha"
              className="h-10 rounded-md border-slate-200 bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              defaultValue={userBeingEdited?.email ?? ""}
              placeholder="voce@empresa.com"
              className="h-10 rounded-md border-slate-200 bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {userBeingEdited ? "Nova senha (opcional)" : "Senha inicial"}
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              placeholder={userBeingEdited ? "Deixe em branco para manter" : "Minimo 8 caracteres"}
              className="h-10 rounded-md border-slate-200 bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Perfil</Label>
            <div className="grid gap-2">
              {Object.values(UserRole).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    defaultChecked={(userBeingEdited?.role ?? UserRole.VENDEDOR) === role}
                  />
                  <span>{roleLabels[role]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lojas liberadas</Label>
            <div className="grid gap-2">
              {stores.map((store) => (
                <label
                  key={store.id}
                  className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="storeIds"
                    value={store.id}
                    defaultChecked={
                      userBeingEdited
                        ? selectedStoreIds.includes(store.id)
                        : store.kind === "ADMINISTRATIVE"
                    }
                  />
                  <span>{store.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lojas padrao</Label>
            <div className="grid gap-2">
              {stores.map((store) => (
                <label
                  key={`default-${store.id}`}
                  className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="defaultStoreId"
                    value={store.id}
                    defaultChecked={
                      selectedDefaultStoreId
                        ? selectedDefaultStoreId === store.id
                        : store.kind === "ADMINISTRATIVE"
                    }
                  />
                  <span>{store.name}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={userBeingEdited?.isActive ?? true}
            />
            <span>Usuario ativo</span>
          </label>

          <div className="flex gap-2">
            <Button type="submit" className="h-10 rounded-md bg-sky-600 hover:bg-sky-700">
              {userBeingEdited ? "Salvar alteracoes" : "Criar usuario"}
            </Button>
            {userBeingEdited ? (
              <Link
                href="/administrativo/usuarios"
                className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
