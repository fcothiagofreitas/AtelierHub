import type { TrocaEstado } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<TrocaEstado, string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const styles: Record<TrocaEstado, string> = {
  EM_ANDAMENTO:
    "border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/55 dark:text-amber-50",
  CONCLUIDA:
    "border-emerald-300/80 bg-emerald-100 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-50",
  CANCELADA:
    "border-red-300/80 bg-red-100 text-red-950 dark:border-red-800/60 dark:bg-red-950/45 dark:text-red-50",
};

export function TrocaEstadoBadge({ estado }: { estado: TrocaEstado }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[estado])}>
      {labels[estado]}
    </Badge>
  );
}
