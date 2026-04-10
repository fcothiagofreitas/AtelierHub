import {
  Bell,
  Building2,
  Database,
  GitBranch,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import { Input } from "@/components/ui/input";

const foundationCards = [
  {
    title: "Arquitetura",
    description: "Next.js, Prisma, Tailwind e shadcn/ui em um monolito modular.",
    icon: Building2,
  },
  {
    title: "Acesso",
    description: "Login por e-mail e senha com base para perfis e escopo por loja.",
    icon: ShieldCheck,
  },
  {
    title: "Dados",
    description: "Schema inicial com tenant, loja, usuario e vinculo usuario-loja.",
    icon: Database,
  },
  {
    title: "Entrega",
    description: "Fluxo alinhado com develop -> staging e main -> production.",
    icon: GitBranch,
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen px-4 py-4 text-zinc-950 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_-40px_rgba(38,30,24,0.32)] backdrop-blur">
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-center gap-3 rounded-[1.5rem] bg-zinc-950 px-4 py-3 text-white">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/12">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">AtelierHub</p>
                <p className="text-xs text-white/70">Workspace</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Navegacao
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-3 rounded-2xl bg-[#fff1ec] px-3 py-3 text-sm font-medium text-zinc-900">
                  <Layers3 className="size-4 text-[#f05a37]" />
                  Dashboard
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-500">
                  <Building2 className="size-4" />
                  Estrutura base
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-500">
                  <ShieldCheck className="size-4" />
                  Autenticacao
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-500">
                  <Database className="size-4" />
                  Prisma
                </div>
                <div className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-500">
                  <GitBranch className="size-4" />
                  Staging & production
                </div>
              </div>
            </div>

            <div className="mt-auto rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Sessao
              </p>
              <div className="mt-3 space-y-1">
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-sm text-zinc-500">{session?.user?.email}</p>
              </div>
              <div className="mt-4 space-y-1 text-sm text-zinc-500">
                <p>Perfil: {session?.user?.role ?? "nao definido"}</p>
                <p>Lojas: {session?.user?.storeIds?.length ?? 0}</p>
              </div>
              <div className="mt-4">
                <SignOutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_20px_60px_-40px_rgba(38,30,24,0.32)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  readOnly
                  value=""
                  placeholder="Buscar modulo, sprint ou insight"
                  className="h-12 rounded-full border-zinc-200 bg-zinc-50 pl-11 shadow-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button className="inline-flex size-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
                  <Bell className="size-4" />
                </button>
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500">
                  Sprint 1 em andamento
                </div>
              </div>
            </header>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-[1.8rem] bg-[#f6f2eb] p-6">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <span className="rounded-full bg-white px-3 py-1">Foundation</span>
                  <span>•</span>
                  <span>MVP bootstrap</span>
                </div>
                <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-zinc-900">
                  A fundacao tecnica do produto ja esta viva.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                  Este dashboard placeholder agora segue uma linguagem mais leve e
                  mais proxima de um SaaS moderno, enquanto segura os dados da
                  sessao autenticada e prepara o terreno da Sprint 2.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {foundationCards.map(({ title, description, icon: Icon }) => (
                    <article
                      key={title}
                      className="rounded-[1.5rem] bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 inline-flex rounded-2xl bg-[#fff1ec] p-3 text-[#f05a37]">
                        <Icon className="size-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.8rem] bg-zinc-950 p-6 text-white">
                  <p className="text-sm text-white/60">Tenant atual</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {session?.user?.tenantId ?? "nao definido"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Base pronta para evoluir contexto por loja, selecao de loja e
                    protecao por perfil na proxima sprint.
                  </p>
                </div>

                <div className="rounded-[1.8rem] bg-white p-6">
                  <p className="text-sm text-zinc-400">Pronto para a Sprint 2</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      Perfis: admin da marca, administrativo, gerente e vendedor
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      Vínculo usuário-loja e seleção de contexto
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      Escopo de tenant e loja aplicado nas rotas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
