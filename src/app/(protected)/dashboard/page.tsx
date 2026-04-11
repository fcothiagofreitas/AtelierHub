import {
  AlertTriangle,
  BanknoteArrowDown,
  Boxes,
  DollarSign,
  PackageCheck,
  ReceiptText,
} from "lucide-react";
import { roleLabels } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getDashboardContent(storeName: string, isAdministrative: boolean) {
  if (isAdministrative) {
    return {
      title: "Resumo administrativo do dia",
      subtitle:
        "Acompanhe transferencias, recebimentos e pendencias que impactam todas as lojas.",
      scopeLabel: "Visao consolidada da marca",
      metrics: [
        {
          label: "Faturamento do dia",
          value: "R$ 48.320",
          helper: "3 lojas operacionais",
          tone: "positive",
          icon: DollarSign,
        },
        {
          label: "Recebimentos pendentes",
          value: "R$ 12.480",
          helper: "7 grupos de cobranca abertos",
          tone: "neutral",
          icon: BanknoteArrowDown,
        },
        {
          label: "Transferencias em transito",
          value: "5",
          helper: "2 aguardando conferencia",
          tone: "warning",
          icon: Boxes,
        },
        {
          label: "Itens com defeito",
          value: "11",
          helper: "4 aguardando retorno da fabrica",
          tone: "warning",
          icon: AlertTriangle,
        },
      ],
      pendingItems: [
        {
          title: "Conferencia pendente da Loja Centro",
          description: "48 pecas enviadas pelo administrativo ainda nao conferidas.",
          badge: "Transferencia",
        },
        {
          title: "Grupo de cobranca da semana",
          description: "3 clientes com saldo em aberto para contato hoje.",
          badge: "Recebimento",
        },
        {
          title: "Defeitos recebidos hoje",
          description: "4 pecas aguardando classificacao e envio para fabrica.",
          badge: "Defeito",
        },
      ],
      salesRows: [
        {
          order: "#005214",
          client: "Atelie Marina Costa",
          seller: "Camila Rocha",
          total: "R$ 3.240",
          status: "Pendente",
        },
        {
          order: "#005213",
          client: "Loja Rosa Nude",
          seller: "Daniela Sousa",
          total: "R$ 1.890",
          status: "Pago parcial",
        },
        {
          order: "#005212",
          client: "Fernanda Nogueira",
          seller: "Patricia Lima",
          total: "R$ 980",
          status: "Concluido",
        },
      ],
      activity: [
        {
          time: "09:15",
          title: "Transferencia criada",
          meta: `${storeName} -> Loja Centro • 48 pecas`,
        },
        {
          time: "10:20",
          title: "Recebimento registrado",
          meta: "Grupo de cobranca #GC-019 baixado parcialmente",
        },
        {
          time: "11:05",
          title: "Defeito recebido",
          meta: "4 pecas da Loja Aldeota aguardando triagem",
        },
      ],
    };
  }

  return {
    title: `Operacao da ${storeName}`,
    subtitle:
      "Acompanhe vendas do dia, pedidos pendentes e alertas de estoque da unidade.",
    scopeLabel: "Visao da loja ativa",
    metrics: [
      {
        label: "Vendas do dia",
        value: "R$ 18.420",
        helper: "22 pedidos finalizados",
        tone: "positive",
        icon: DollarSign,
      },
      {
        label: "Ticket medio",
        value: "R$ 837",
        helper: "Acima da meta diaria",
        tone: "neutral",
        icon: ReceiptText,
      },
      {
        label: "Pedidos em aberto",
        value: "6",
        helper: "2 aguardando pagamento",
        tone: "warning",
        icon: BanknoteArrowDown,
      },
      {
        label: "Alerta de estoque",
        value: "8 SKUs",
        helper: "Reposicao sugerida para best sellers",
        tone: "warning",
        icon: PackageCheck,
      },
    ],
    pendingItems: [
      {
        title: "Pedido aguardando pagamento",
        description: "Pedido #005214 de Atelie Marina Costa ainda sem baixa.",
        badge: "Financeiro",
      },
      {
        title: "Transferencia a conferir",
        description: "18 pecas recebidas do administrativo precisam de conferencia.",
        badge: "Estoque",
      },
      {
        title: "Cliente com limite proximo",
        description: "Loja Rosa Nude esta a R$ 420 do limite de credito.",
        badge: "Cliente",
      },
    ],
    salesRows: [
      {
        order: "#005214",
        client: "Atelie Marina Costa",
        seller: "Camila Rocha",
        total: "R$ 3.240",
        status: "Pendente",
      },
      {
        order: "#005213",
        client: "Loja Rosa Nude",
        seller: "Camila Rocha",
        total: "R$ 1.890",
        status: "Pago parcial",
      },
      {
        order: "#005212",
        client: "Fernanda Nogueira",
        seller: "Mariana Farias",
        total: "R$ 980",
        status: "Concluido",
      },
      {
        order: "#005211",
        client: "Studio Aline Modas",
        seller: "Mariana Farias",
        total: "R$ 1.420",
        status: "Concluido",
      },
    ],
    activity: [
      {
        time: "09:12",
        title: "Venda registrada",
        meta: "Pedido #005214 • Camila Rocha",
      },
      {
        time: "10:05",
        title: "Pagamento parcial",
        meta: "Pedido #005213 recebeu R$ 900 no caixa",
      },
      {
        time: "10:48",
        title: "Transferencia recebida",
        meta: "18 pecas chegaram do administrativo para conferencia",
      },
    ],
  };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { session, activeStore, availableStores } = await getActiveStoreContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const deniedParam = resolvedSearchParams?.denied;
  const accessDenied = Array.isArray(deniedParam)
    ? deniedParam.includes("1")
    : deniedParam === "1";
  const isAdministrative = activeStore?.kind === "ADMINISTRATIVE";
  const content = getDashboardContent(
    activeStore?.name ?? "Operacao atual",
    isAdministrative,
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">
                {roleLabels[session.user.role ?? "VENDEDOR"]} em{" "}
                <span className="font-medium text-slate-900">
                  {activeStore?.name ?? "Operacao nao definida"}
                </span>
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {content.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {content.subtitle}
              </p>
            </div>

            <div className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Escopo ativo
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {content.scopeLabel}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {availableStores.length} loja(s) acessiveis nesta sessao
              </p>
            </div>
          </div>

          {accessDenied ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A rota solicitada exige outro perfil. Sua sessao continua ativa no
              contexto atual.
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {content.metrics.map(({ label, value, helper, tone, icon: Icon }) => (
              <article
                key={label}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={[
                      "max-w-[10rem] rounded-md px-2 py-1 text-right text-xs font-medium leading-4",
                      tone === "positive"
                        ? "bg-emerald-50 text-emerald-700"
                        : tone === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {helper}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-500">{label}</p>
                <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-950">
                  {value}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Pendencias da operacao
              </p>
              <p className="text-sm text-slate-500">
                O que precisa de atencao ainda hoje
              </p>
            </div>
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Boxes className="size-4" />
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {content.pendingItems.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {item.badge}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Pedidos recentes
              </h3>
              <p className="text-sm text-slate-500">
                Ultimos pedidos da operacao ativa
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Hoje
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {content.salesRows.map((row) => (
                  <tr key={row.order} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.order}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.client}</td>
                    <td className="px-4 py-3 text-slate-600">{row.seller}</td>
                    <td className="px-4 py-3 text-slate-900">{row.total}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-md px-2 py-1 text-xs font-medium",
                          row.status === "Concluido"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.status === "Pago parcial"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Atividade recente
            </h3>
            <p className="text-sm text-slate-500">
              Eventos da operacao registrados nesta sessao
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {content.activity.map((item, index) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-4">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {item.time}
                  </span>
                  {index < content.activity.length - 1 ? (
                    <div className="mt-2 h-full w-px bg-slate-200" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.meta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
