import {
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { roleLabels } from "@/lib/authorization";
import { SidebarNav } from "@/modules/auth/components/sidebar-nav";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import { StoreSwitcher } from "@/modules/auth/components/store-switcher";
import type { UserRole } from "@/generated/prisma/enums";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type ProtectedShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  role?: UserRole;
  currentStoreId: string | null;
  currentStoreName: string;
  stores: StoreOption[];
};

function getInitials(name?: string | null) {
  if (!name) {
    return "AH";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProtectedShell({
  children,
  userName,
  userEmail,
  role,
  currentStoreId,
  currentStoreName,
  stores,
}: ProtectedShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-slate-100/95">
          <div className="flex h-full flex-col px-5 py-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex size-10 items-center justify-center rounded-md bg-sky-600 text-sm font-semibold text-white shadow-sm">
                AH
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">AtelierHub</p>
                <p className="text-xs text-slate-500">Operacao multi-loja</p>
              </div>
            </div>

            <div className="mt-6">
              <Input
                readOnly
                value=""
                placeholder="Buscar modulo"
                className="h-10 rounded-md border-slate-200 bg-white text-sm shadow-sm"
              />
            </div>

            <SidebarNav />

            <div className="mt-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>
              </div>
              <div className="mt-4 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Perfil
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {role ? roleLabels[role] : "Nao definido"}
                </p>
              </div>
              <div className="mt-4">
                <SignOutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-white">
          <header className="border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workspace
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Dashboard
                  </h1>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {currentStoreName}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <StoreSwitcher currentStoreId={currentStoreId} stores={stores} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-md border-slate-200 bg-white shadow-sm"
                >
                  <Bell className="size-4 text-slate-500" />
                </Button>
              </div>
            </div>
            <Separator className="mt-4" />
          </header>

          <div className="px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
