import {
  Building2,
  LockKeyhole,
  Package,
  ReceiptText,
  Store,
} from "lucide-react";
import { LoginForm } from "@/modules/auth/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const loginHighlights = [
  {
    title: "Operacao multi-loja",
    description: "Troque de unidade dentro do mesmo sistema sem perder contexto.",
    icon: Store,
  },
  {
    title: "Vendas e recebimentos",
    description: "Fluxos de PDV, pedidos e cobrancas na mesma base operacional.",
    icon: ReceiptText,
  },
  {
    title: "Estoque rastreavel",
    description: "Movimentacao entre lojas, administrativo e historico centralizado.",
    icon: Package,
  },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrlParam = resolvedSearchParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam)
    ? callbackUrlParam[0]
    : callbackUrlParam;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.18)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-slate-200 bg-slate-100/80 px-6 py-6 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white">
              AH
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">AtelierHub</p>
              <p className="text-xs text-slate-500">Sistema operacional de loja</p>
            </div>
          </div>

          <div className="mt-8">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Acesso ao sistema
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Entre para continuar a operacao.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O login usa o mesmo contexto visual do painel para a entrada no MVP
              parecer parte do sistema, nao uma tela solta.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {loginHighlights.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Building2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">Tenant demo ativo</p>
                <p className="text-sm text-slate-500">AtelierHub Demo</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center bg-white px-6 py-8 lg:px-10">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <LockKeyhole className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workspace
                </p>
                <p className="text-sm text-slate-600">Entrada segura por credenciais</p>
              </div>
            </div>

            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </section>
      </div>
    </main>
  );
}
