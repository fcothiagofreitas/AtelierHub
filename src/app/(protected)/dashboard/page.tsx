import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  DollarSign,
  ReceiptText,
} from "lucide-react";
import { roleLabels } from "@/lib/authorization";
import { getActiveStoreContext } from "@/lib/session";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const primaryMetrics = [
  {
    label: "Vendas hoje",
    value: "R$ 18.420",
    delta: "+12.4%",
    tone: "positive",
    icon: DollarSign,
  },
  {
    label: "Pedidos em aberto",
    value: "14",
    delta: "3 aguardando pagamento",
    tone: "neutral",
    icon: ReceiptText,
  },
  {
    label: "Itens com alerta",
    value: "8",
    delta: "Reposicao sugerida",
    tone: "warning",
    icon: Boxes,
  },
  {
    label: "Pendencias operacionais",
    value: "5",
    delta: "2 exigem revisao hoje",
    tone: "warning",
    icon: AlertTriangle,
  },
];

const pendingItems = [
  {
    title: "Transferencia aguardando conferencia",
    description: "Loja Centro -> Loja Aldeota",
    badge: "Estoque",
  },
  {
    title: "Grupo de cobranca do dia",
    description: "3 pedidos pendentes de recebimento",
    badge: "Financeiro",
  },
  {
    title: "Cadastro aguardando aprovacao",
    description: "1 novo vendedor criado pela area administrativa",
    badge: "Cadastros",
  },
];

const recentActivity = [
  {
    time: "09:12",
    title: "Venda registrada",
    meta: "Pedido #004812 • Loja Centro",
  },
  {
    time: "10:05",
    title: "Troca de contexto",
    meta: "Operacao alterada para Loja Aldeota",
  },
  {
    time: "10:48",
    title: "Conferencia concluida",
    meta: "Transferencia recebida no administrativo",
  },
];

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { session, activeStore, availableStores } = await getActiveStoreContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const deniedParam = resolvedSearchParams?.denied;
  const accessDenied = Array.isArray(deniedParam)
    ? deniedParam.includes("1")
    : deniedParam === "1";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {roleLabels[session.user.role ?? "VENDEDOR"]} na operacao{" "}
                <span className="font-medium text-slate-900">
                  {activeStore?.name ?? "Nao definida"}
                </span>
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Um painel mais proximo do dia a dia da loja.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                A sessao agora nasce com tenant, perfil e contexto de loja ativos.
                A troca de operacao fica no topo do sistema, sem tirar a pessoa da
                rotina.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Escopo ativo
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {availableStores.length} loja(s) disponiveis
              </p>
              <p className="text-sm text-slate-500">Tenant {session.user.tenantId}</p>
            </div>
          </div>

          {accessDenied ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A rota solicitada exige outro perfil. Sua sessao continua ativa no
              contexto atual.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {primaryMetrics.map(({ label, value, delta, tone, icon: Icon }) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-xs font-medium",
                      tone === "positive"
                        ? "bg-emerald-50 text-emerald-700"
                        : tone === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {delta}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {value}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Pendencias</p>
              <p className="text-sm text-slate-500">
                O que merece atencao na operacao atual
              </p>
            </div>
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ClipboardList className="size-4" />
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {pendingItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {item.badge}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Contexto operacional
              </h3>
              <p className="text-sm text-slate-500">
                Estrutura base pronta para os proximos modulos do MVP
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            >
              Ver backlog
              <ArrowUpRight className="size-4" />
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Bloco</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Observacao</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">Auth e perfis</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Sessao com tenant, role e loja ativa
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">Troca de operacao</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Select persistente no header
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">Rotas protegidas</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Middleware + bloqueio inicial por perfil
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Atividade recente
            </h3>
            <p className="text-sm text-slate-500">
              Feedback visual de que a pessoa esta dentro de um sistema, nao de
              uma tela-conceito.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {recentActivity.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-4">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {item.time}
                  </span>
                  <div className="mt-2 h-full w-px bg-slate-200" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
