import Link from "next/link";
import { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertStore } from "@/modules/admin/actions/store-actions";

type LojasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LojasPage({ searchParams }: LojasPageProps) {
  const session = await requireRole([
    UserRole.ADMIN_DA_MARCA,
    UserRole.ADMINISTRATIVO,
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : "";
  const editId =
    typeof resolvedSearchParams?.edit === "string" ? resolvedSearchParams.edit : "";

  const stores = await prisma.store.findMany({
    where: {
      tenantId: session.user.tenantId ?? "",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { userAccess: true },
      },
    },
  });

  const storeBeingEdited = stores.find((store) => store.id === editId) ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Lojas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie as unidades operacionais e a loja administrativa.
            </p>
          </div>

          <form className="flex w-full max-w-sm gap-2" action="/administrativo/lojas">
            <Input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome ou slug"
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
                <th className="px-4 py-3 font-medium">Loja</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {store.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {store.kind === "ADMINISTRATIVE"
                      ? "Administrativo"
                      : "Operacional"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{store.slug}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {store._count.userAccess}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-md px-2 py-1 text-xs font-medium",
                        store.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {store.isActive ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/administrativo/lojas?edit=${store.id}`}
                      className="text-sm font-medium text-sky-700 hover:text-sky-800"
                    >
                      Editar
                    </Link>
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
            {storeBeingEdited ? "Editar loja" : "Nova loja"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre lojas operacionais e mantenha a loja administrativa separada.
          </p>
        </div>

        <form action={upsertStore} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={storeBeingEdited?.id ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="store-name">Nome</Label>
            <Input
              id="store-name"
              name="name"
              defaultValue={storeBeingEdited?.name ?? ""}
              placeholder="Ex.: Loja Aldeota"
              className="h-10 rounded-md border-slate-200 bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de loja</Label>
            <div className="grid gap-2">
              {[
                { value: "OPERATIONAL", label: "Operacional" },
                { value: "ADMINISTRATIVE", label: "Administrativa" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="kind"
                    value={option.value}
                    defaultChecked={
                      (storeBeingEdited?.kind ?? "OPERATIONAL") === option.value
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={storeBeingEdited?.isActive ?? true}
            />
            <span>Loja ativa</span>
          </label>

          <div className="flex gap-2">
            <Button type="submit" className="h-10 rounded-md bg-sky-600 hover:bg-sky-700">
              {storeBeingEdited ? "Salvar alteracoes" : "Criar loja"}
            </Button>
            {storeBeingEdited ? (
              <Link
                href="/administrativo/lojas"
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
