import { Building2, Handshake, LibraryBig, Package, Users, UserCheck } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const tenantId = session.user.tenantId;

  const [
    totalStores,
    activeStores,
    totalColaboradores,
    activeColaboradores,
    totalCorretores,
    activeCorretores,
    totalProdutos,
    skusComSaldo,
  ] = await Promise.all([
    prisma.store.count({ where: { tenantId } }),
    prisma.store.count({ where: { tenantId, isActive: true } }),
    prisma.colaborador.count({ where: { tenantId } }),
    prisma.colaborador.count({ where: { tenantId, isActive: true } }),
    prisma.corretor.count({ where: { tenantId } }),
    prisma.corretor.count({ where: { tenantId, isActive: true, isBlocked: false } }),
    prisma.produto.count({ where: { tenantId } }),
    prisma.estoqueSaldo.count({
      where: { tenantId, quantidade: { gt: 0 } },
    }),
  ]);

  const cards = [
    {
      label: "Lojas",
      value: activeStores,
      total: totalStores,
      icon: Building2,
      href: "/admin/lojas",
      description: `${totalStores - activeStores} inativa${totalStores - activeStores !== 1 ? "s" : ""}`,
      cta: "Gerenciar lojas",
    },
    {
      label: "Colaboradores ativos",
      value: activeColaboradores,
      total: totalColaboradores,
      icon: UserCheck,
      href: "/admin/colaboradores",
      description: `${totalColaboradores - activeColaboradores} inativo${totalColaboradores - activeColaboradores !== 1 ? "s" : ""}`,
      cta: "Gerenciar colaboradores",
    },
    {
      label: "Total de colaboradores",
      value: totalColaboradores,
      total: totalColaboradores,
      icon: Users,
      href: "/admin/colaboradores",
      description: "Todos os cargos",
      cta: "Ver colaboradores",
    },
    {
      label: "Corretores ativos",
      value: activeCorretores,
      total: totalCorretores,
      icon: Handshake,
      href: "/admin/corretores",
      description: `${totalCorretores - activeCorretores} inativo${totalCorretores - activeCorretores !== 1 ? "s" : ""} ou bloqueado${totalCorretores - activeCorretores !== 1 ? "s" : ""}`,
      cta: "Gerenciar corretores",
    },
    {
      label: "Produtos no catálogo",
      value: totalProdutos,
      total: totalProdutos,
      icon: LibraryBig,
      href: "/admin/catalogo/produtos",
      description: "Com variações e dados fiscais",
      cta: "Abrir catálogo",
    },
    {
      label: "Linhas de saldo (>0)",
      value: skusComSaldo,
      total: skusComSaldo,
      icon: Package,
      href: "/admin/estoque",
      description: "Por loja e variação",
      cta: "Abrir estoque",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Painel administrativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure lojas, colaboradores, corretores, catálogo e acessos da marca.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                <card.icon className="size-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            <p className="mt-4 text-xs font-medium text-primary group-hover:underline">
              {card.cta} →
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Acesso rápido</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickLink href="/admin/lojas/new" label="Nova loja" />
          <QuickLink href="/admin/colaboradores/new" label="Novo colaborador" />
          <QuickLink href="/admin/corretores/new" label="Novo corretor" />
          <QuickLink href="/admin/catalogo" label="Catálogo" />
          <QuickLink href="/admin/catalogo/produtos/new" label="Novo produto" />
          <QuickLink href="/admin/estoque" label="Estoque" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
    >
      {label}
    </Link>
  );
}
