"use client";

import {
  Building2,
  ClipboardList,
  LayoutGrid,
  Package,
  Settings2,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationGroups = [
  {
    label: "Visao geral",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { label: "Vendas", href: "/dashboard", icon: ShoppingBag },
      { label: "Estoque", href: "/dashboard", icon: Package },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { label: "Clientes", href: "/dashboard", icon: Users },
      { label: "Lojas", href: "/administrativo/lojas", icon: Building2 },
      {
        label: "Administrativo",
        href: "/administrativo",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Usuarios", href: "/administrativo/usuarios", icon: Users },
      { label: "Configuracoes", href: "/dashboard", icon: Settings2 },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-6">
      {navigationGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {group.label}
          </p>
          <div className="mt-2 space-y-1">
            {group.items.map(({ label, href, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(`${href}/`));

              return (
                <Link
                  key={`${href}-${label}`}
                  href={href}
                  className={[
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex size-8 items-center justify-center rounded-sm",
                      active ? "bg-sky-50 text-sky-700" : "bg-transparent",
                    ].join(" ")}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
