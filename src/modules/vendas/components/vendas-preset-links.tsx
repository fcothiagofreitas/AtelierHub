import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildVendasHref } from "../lib/build-href";

const PRESETS: { id: string; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
];

type Props = {
  searchParams: URLSearchParams;
  activePreset: string | undefined;
  hasCustomRange: boolean;
};

export function VendasPresetLinks({
  searchParams,
  activePreset,
  hasCustomRange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="self-center text-xs text-muted-foreground">Período:</span>
      {PRESETS.map((p) => {
        const href = buildVendasHref(searchParams, {
          preset: p.id,
          from: null,
          to: null,
        });
        const active = !hasCustomRange && activePreset === p.id;
        return (
          <Link
            key={p.id}
            href={href}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted/60",
            )}
          >
            {p.label}
          </Link>
        );
      })}
      <Link
        href={buildVendasHref(searchParams, {
          preset: null,
          from: null,
          to: null,
        })}
        className={cn(
          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          !hasCustomRange && !activePreset
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card hover:bg-muted/60",
        )}
      >
        Todos
      </Link>
    </div>
  );
}
