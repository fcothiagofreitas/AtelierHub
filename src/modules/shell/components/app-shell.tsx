import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleLabels } from "@/lib/authorization";
import { NavHeader } from "./nav-header";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type AppShellProps = {
  children: ReactNode;
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
        {/* Logo */}
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

        {/* Nav */}
        <div className="flex flex-1 flex-col overflow-hidden px-3 py-4">
          <SidebarNav userRole={userRole} />
        </div>

        {/* User */}
        <div className="border-t p-3 space-y-1">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {roleLabels[userRole]}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <NavHeader
          userName={userName}
          stores={stores}
          activeStoreId={activeStoreId}
          activeStoreName={activeStoreName}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
