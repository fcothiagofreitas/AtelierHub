import type { PedidoEstado } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { pedidoEstadoLabels } from "@/modules/vendas/lib/labels";
import { cn } from "@/lib/utils";

const porEstado: Record<
  PedidoEstado,
  string
> = {
  EM_ANDAMENTO:
    "border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/55 dark:text-amber-50",
  EM_ABERTO:
    "border-sky-300/80 bg-sky-100 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-50",
  PAGO_PARCIAL:
    "border-violet-300/80 bg-violet-100 text-violet-950 dark:border-violet-700/60 dark:bg-violet-950/50 dark:text-violet-50",
  QUITADO:
    "border-emerald-300/80 bg-emerald-100 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-50",
  CANCELADO:
    "border-red-300/80 bg-red-100 text-red-950 dark:border-red-800/60 dark:bg-red-950/45 dark:text-red-50",
};

type Props = {
  estado: PedidoEstado;
  className?: string;
};

/** Badge de estado de pedido com cores consistentes (lista, PDV, resumos). */
export function PedidoEstadoBadge({ estado, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-[11px] font-medium",
        porEstado[estado],
        className,
      )}
    >
      {pedidoEstadoLabels[estado]}
    </Badge>
  );
}
