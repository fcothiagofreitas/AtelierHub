"use client";

import {
  Building2,
  LayoutGrid,
  Package,
  Settings2,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  soon?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { label: "Vendas", href: "/vendas", icon: ShoppingBag, soon: true },
      { label: "Estoque", href: "/estoque", icon: Package, soon: true },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { label: "Lojas", href: "/admin/lojas", icon: Building2 },
      { label: "Usuários", href: "/admin/usuarios", icon: Users },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings2, soon: true },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex-1 space-y-5 overflow-y-auto">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group.label}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href + "/"));

              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.soon ? "#" : item.href}
                    aria-disabled={item.soon}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
