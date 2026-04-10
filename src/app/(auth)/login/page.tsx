import { LoginForm } from "@/modules/auth/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrlParam = resolvedSearchParams?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam)
    ? callbackUrlParam[0]
    : callbackUrlParam;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_22%),radial-gradient(circle_at_top_right,rgba(255,122,89,0.10),transparent_18%),linear-gradient(180deg,#f6f3ee_0%,#efebe5_100%)]" />
      <div className="relative z-10 grid w-full max-w-7xl gap-8 rounded-[2rem] border border-white/70 bg-white/42 p-4 shadow-[0_24px_80px_-48px_rgba(31,24,18,0.34)] backdrop-blur-xl lg:grid-cols-[1.25fr_0.75fr] lg:p-5">
        <section className="rounded-[1.8rem] bg-[#f4efe8] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 shadow-sm">
              AtelierHub
            </span>
            <span className="inline-flex rounded-full border border-white bg-white/60 px-4 py-1.5 text-sm text-zinc-500">
              Sprint 1 • Foundation
            </span>
          </div>

          <div className="mt-7 flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-zinc-900 sm:text-5xl lg:text-6xl">
                Uma base leve, arredondada e pronta para virar produto.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">
                O MVP começa com uma experiencia mais proxima de software de startup:
                superficies suaves, navegacao clara e uma fundacao tecnica que ja
                sustenta auth, tenant, loja e deploy em dois ambientes.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Access
                </p>
                <h2 className="mt-3 text-lg font-semibold text-zinc-900">
                  Login por credenciais
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Auth com e-mail e senha, pronto para perfis e escopo por loja.
                </p>
              </div>

              <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Core
                </p>
                <h2 className="mt-3 text-lg font-semibold text-zinc-900">
                  Tenant, loja e usuario
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Estrutura inicial do dominio pronta para abrir a Sprint 2.
                </p>
              </div>

              <div className="rounded-[1.6rem] bg-zinc-950 p-5 text-white shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Delivery
                </p>
                <h2 className="mt-3 text-lg font-semibold">
                  Develop e main alinhados
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Base preparada para staging e production com o fluxo definido.
                </p>
              </div>
            </div>
          </div>
        </section>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
