import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { roleLabels } from "@/lib/authorization";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { StoreSwitcher } from "./store-switcher";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type AppShellProps = {
  children: ReactNode;
  pageTitle: string;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userRole: UserRole;
  stores: StoreOption[];
  activeStoreId: string | null;
  activeStoreName: string;
};

function initials(name?: string | null) {
  if (!name) return "AH";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({
  children,
  pageTitle,
  userName,
  userEmail,
  userRole,
  stores,
  activeStoreId,
  activeStoreName,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            AH
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">AtelierHub</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Operação multi-loja
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden px-3 py-4">
          <SidebarNav />
        </div>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {roleLabels[userRole]}
              </p>
            </div>
          </div>
          <div className="mt-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1">
            <h1 className="text-sm font-semibold">{pageTitle}</h1>
            <p className="text-[11px] text-muted-foreground">{activeStoreName}</p>
          </div>
          <StoreSwitcher stores={stores} activeStoreId={activeStoreId} />
          <Separator orientation="vertical" className="h-6" />
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
