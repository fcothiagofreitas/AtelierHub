import {
  AlertTriangle,
  Building2,
  Handshake,
  LibraryBig,
  Package,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getAdminConsolidadoSnapshot } from "@/modules/admin/admin-consolidado-queries";

const fmtBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function AdminPage() {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const tenantId = session.user.tenantId;

  const [
    consolidado,
    totalStores,
    activeStores,
    totalColaboradores,
    activeColaboradores,
    totalCorretores,
    activeCorretores,
    totalProdutos,
  ] = await Promise.all([
    getAdminConsolidadoSnapshot(tenantId),
    prisma.store.count({ where: { tenantId } }),
    prisma.store.count({ where: { tenantId, isActive: true } }),
    prisma.colaborador.count({ where: { tenantId } }),
    prisma.colaborador.count({ where: { tenantId, isActive: true } }),
    prisma.corretor.count({ where: { tenantId } }),
    prisma.corretor.count({ where: { tenantId, isActive: true, isBlocked: false } }),
    prisma.produto.count({ where: { tenantId } }),
  ]);

  const skusComSaldo = consolidado.estoque.skusComSaldoPositivo;
  const { vendas, estoque, pendencias } = consolidado;

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

  const alertaPendencias =
    vendas.pedidosComPagamentoAberto > 0 ||
    vendas.pedidosEmAndamento > 0 ||
    pendencias.balancosRascunho > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Painel administrativo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão consolidada da marca: cadastros, vendas, estoque e pendências. A lista de vendas na
          operação continua por loja ativa (troque a loja no cabeçalho para outra unidade).
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

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Vendas da marca</h3>
          <Link
            href="/vendas"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir vendas →
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Totais por tenant; detalhe e filtros por loja na operação.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pedidos (7 dias, exc. cancelados)" value={vendas.pedidosUltimos7Dias} />
          <Stat label="Pedidos (30 dias, exc. cancelados)" value={vendas.pedidosUltimos30Dias} />
          <Stat label="Quitados (7 dias)" value={vendas.pedidosQuitadosUltimos7Dias} />
          <Stat label="Quitados (30 dias)" value={vendas.pedidosQuitadosUltimos30Dias} />
          <Stat
            label="Valor quitado (7 dias)"
            value={fmtBrl.format(vendas.valorQuitadoUltimos7Dias)}
          />
          <Stat
            label="Valor quitado (30 dias)"
            value={fmtBrl.format(vendas.valorQuitadoUltimos30Dias)}
          />
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Estoque da marca</h3>
          <Link
            href="/admin/estoque/consulta"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Consulta por loja →
          </Link>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Linhas com saldo &gt; 0" value={estoque.skusComSaldoPositivo} />
          <Stat label="Total de peças (todas as lojas)" value={estoque.quantidadeTotalPecas} />
        </dl>
        {estoque.topLojasPorPecas.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Loja</th>
                  <th className="px-3 py-2 text-right font-medium">Peças (soma saldos)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {estoque.topLojasPorPecas.map((row) => (
                  <tr key={row.storeId}>
                    <td className="px-3 py-2">{row.storeName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className={`rounded-lg border p-5 ${
          alertaPendencias
            ? "border-amber-300/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "bg-card"
        }`}
      >
        <div className="flex items-start gap-2">
          {alertaPendencias && (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-500" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Pendências e alertas</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">{vendas.pedidosEmAndamento}</span>{" "}
                pedido(s) em andamento (PDV não finalizado)
              </li>
              <li>
                <span className="font-medium text-foreground">
                  {vendas.pedidosComPagamentoAberto}
                </span>{" "}
                pedido(s) com pagamento em aberto (em aberto ou pago parcial)
              </li>
              <li>
                <span className="font-medium text-foreground">{pendencias.balancosRascunho}</span>{" "}
                balanço(s) de estoque em rascunho
                {pendencias.balancosRascunho > 0 && (
                  <>
                    {" "}
                    —{" "}
                    <Link
                      href="/admin/estoque/balanco"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      ver balanços
                    </Link>
                  </>
                )}
              </li>
              <li>
                <span className="font-medium text-foreground">{pendencias.gruposCobranca}</span>{" "}
                lote(s) de recebimento registado(s)
                {pendencias.gruposCobranca > 0 && (
                  <>
                    {" "}
                    —{" "}
                    <Link
                      href="/contas-receber"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      contas a receber
                    </Link>
                  </>
                )}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Acesso rápido</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickLink href="/vendas" label="Vendas" icon={ShoppingBag} />
          <QuickLink href="/clientes" label="Clientes" />
          <QuickLink href="/contas-receber" label="Contas a receber" />
          <QuickLink href="/trocas" label="Trocas" />
          <QuickLink href="/admin/comissoes" label="Comissões" />
          <QuickLink href="/admin/lojas/new" label="Nova loja" />
          <QuickLink href="/admin/colaboradores/new" label="Novo colaborador" />
          <QuickLink href="/admin/corretores/new" label="Novo corretor" />
          <QuickLink href="/admin/catalogo" label="Catálogo" />
          <QuickLink href="/admin/catalogo/produtos/new" label="Novo produto" />
          <QuickLink href="/admin/estoque" label="Estoque" icon={Package} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
    >
      {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
      {label}
    </Link>
  );
}
