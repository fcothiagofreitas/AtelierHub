import Link from "next/link";
import {
  FolderTree,
  Layers,
  LayoutGrid,
  Package,
  Palette,
  Ruler,
  Tags,
} from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const links = [
  {
    href: "/admin/catalogo/categorias",
    label: "Categorias",
    description: "Classificação principal do catálogo.",
    icon: FolderTree,
  },
  {
    href: "/admin/catalogo/subcategorias",
    label: "Subcategorias",
    description: "Detalhe dentro de cada categoria.",
    icon: LayoutGrid,
  },
  {
    href: "/admin/catalogo/tipos",
    label: "Tipos",
    description: "Tipos de produto (ex.: calça, blusa).",
    icon: Tags,
  },
  {
    href: "/admin/catalogo/colecoes",
    label: "Coleções",
    description: "Agrupamentos comerciais ou sazonais.",
    icon: Layers,
  },
  {
    href: "/admin/catalogo/tamanhos",
    label: "Grades de tamanhos",
    description: "Conjuntos (letras, numérico…) e opções P, M, 38… dentro de cada um.",
    icon: Ruler,
  },
  {
    href: "/admin/catalogo/cores",
    label: "Cores",
    description: "Cores do catálogo para combinar com tamanhos.",
    icon: Palette,
  },
  {
    href: "/admin/catalogo/produtos",
    label: "Produtos",
    description: "Itens com variações, EAN-13 e dados fiscais.",
    icon: Package,
  },
];

export default async function CatalogoHubPage() {
  await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Catálogo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros centrais da marca — base para estoque e vendas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex size-9 items-center justify-center rounded-md bg-muted">
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-medium">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <p className={cn(buttonVariants({ variant: "link" }), "mt-3 h-auto p-0 text-xs")}>
              Abrir →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
