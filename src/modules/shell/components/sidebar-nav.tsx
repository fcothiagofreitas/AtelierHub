"use client";

import {
  Building2,
  Handshake,
  LayoutGrid,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingBag,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  soon?: boolean;
  roles?: UserRole[];
};

type NavGroup = {
  label: string;
  roles?: UserRole[];
  items: NavItem[];
};

const ADMIN_ROLES: UserRole[] = ["ADMIN_DA_MARCA", "ADMINISTRATIVO"];

const ROLES_COM_CLIENTES: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
  "VENDEDOR",
];

const navGroups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      {
        label: "Clientes",
        href: "/clientes",
        icon: UserCircle,
        roles: ROLES_COM_CLIENTES,
      },
      { label: "Vendas", href: "/vendas", icon: ShoppingBag, soon: true },
      { label: "Estoque", href: "/estoque", icon: Package, soon: true },
    ],
  },
  {
    label: "Administrativo",
    roles: ADMIN_ROLES,
    items: [
      {
        label: "Painel",
        href: "/admin",
        icon: LayoutDashboard,
        roles: ADMIN_ROLES,
      },
      {
        label: "Lojas",
        href: "/admin/lojas",
        icon: Building2,
        roles: ADMIN_ROLES,
      },
      {
        label: "Colaboradores",
        href: "/admin/colaboradores",
        icon: Users,
        roles: ADMIN_ROLES,
      },
      {
        label: "Corretores",
        href: "/admin/corretores",
        icon: Handshake,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings2,
        soon: true,
        roles: ADMIN_ROLES,
      },
    ],
  },
];

type SidebarNavProps = {
  userRole: UserRole;
};

export function SidebarNav({ userRole }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleGroups = navGroups
    .filter((g) => !g.roles || g.roles.includes(userRole))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(userRole)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => {
              const EXACT_ONLY = ["/dashboard", "/admin"];
              const isExact = pathname === item.href;
              const isParent =
                !EXACT_ONLY.includes(item.href) &&
                pathname.startsWith(item.href + "/");
              const active = isExact || isParent;

              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.soon ? "#" : item.href}
                    aria-disabled={item.soon}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      item.soon && "pointer-events-none opacity-40",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.soon && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Em breve
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
