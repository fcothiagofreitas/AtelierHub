"use client";

import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StoreSwitcher } from "./store-switcher";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type NavHeaderProps = {
  userName: string | null | undefined;
  stores: StoreOption[];
  activeStoreId: string | null;
  activeStoreName: string;
};

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/admin": "Painel administrativo",
  "/admin/lojas": "Lojas",
  "/admin/lojas/new": "Nova loja",
  "/admin/colaboradores": "Colaboradores",
  "/admin/colaboradores/new": "Novo colaborador",
  "/vendas": "Vendas",
  "/estoque": "Estoque",
  "/clientes": "Clientes",
  "/configuracoes": "Configurações",
};

function resolveTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  // Tenta correspondência parcial para rotas aninhadas como /admin/lojas/new
  const match = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((key) => key !== "/" && pathname.startsWith(key + "/"));
  return match ? routeTitles[match] : "AtelierHub";
}

function initials(name?: string | null) {
  if (!name) return "AH";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function NavHeader({
  userName,
  stores,
  activeStoreId,
  activeStoreName,
}: NavHeaderProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {activeStoreName}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <StoreSwitcher stores={stores} activeStoreId={activeStoreId} />
        <Separator orientation="vertical" className="h-5" />
        <Avatar className="size-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
