import { Building2, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { UserRole } from "@/generated/prisma/enums";
import { requireRole, roleLabels } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function AdministrativoPage() {
  const session = await requireRole([
    UserRole.ADMIN_DA_MARCA,
    UserRole.ADMINISTRATIVO,
  ]);

  const [storesCount, usersCount, activeUsersCount] = await Promise.all([
    prisma.store.count({
      where: { tenantId: session.user.tenantId ?? "" },
    }),
    prisma.user.count({
      where: { tenantId: session.user.tenantId ?? "" },
    }),
    prisma.user.count({
      where: { tenantId: session.user.tenantId ?? "", isActive: true },
    }),
  ]);

  const cards = [
    {
      title: "Lojas",
      value: storesCount,
      helper: "Unidades cadastradas para a marca",
      href: "/administrativo/lojas",
      icon: Building2,
    },
    {
      title: "Usuarios",
      value: usersCount,
      helper: "Perfis com acesso ao sistema",
      href: "/administrativo/usuarios",
      icon: Users,
    },
    {
      title: "Usuarios ativos",
      value: activeUsersCount,
      helper: "Operacao liberada para uso agora",
      href: "/administrativo/usuarios",
      icon: UserCog,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-500">
          {roleLabels[session.user.role ?? UserRole.ADMINISTRATIVO]}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Painel administrativo
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Use esta area para montar a operacao da marca: lojas, usuarios,
          perfis e acessos por unidade.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, value, helper, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
              </div>
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <Icon className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
