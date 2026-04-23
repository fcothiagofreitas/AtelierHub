import type { PedidoEstado } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildVendasHref } from "../lib/build-href";
import { pedidoEstadoLabels } from "../lib/labels";

const ESTADOS_ORDEM: PedidoEstado[] = [
  "EM_ANDAMENTO",
  "EM_ABERTO",
  "PAGO_PARCIAL",
  "QUITADO",
  "CANCELADO",
];

type Props = {
  searchParams: URLSearchParams;
  estado: string | undefined;
  /** `"1"` quando o filtro «EM_ABERTO + PAGO_PARCIAL» está ativo. */
  estadoAberto: string | undefined;
};

export function VendasEstadoPresetLinks({
  searchParams,
  estado,
  estadoAberto,
}: Props) {
  const isTodos = !estado && estadoAberto !== "1";
  const isComSaldo = !estado && estadoAberto === "1";

  return (
    <div className="flex flex-wrap gap-2">
      <span className="self-center text-xs text-muted-foreground">Estado:</span>
      <Link
        href={buildVendasHref(searchParams, {
          estado: null,
          estadoAberto: null,
        })}
        className={cn(
          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          isTodos
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card hover:bg-muted/60",
        )}
      >
        Todos
      </Link>
      <Link
        href={buildVendasHref(searchParams, {
          estado: null,
          estadoAberto: "1",
        })}
        className={cn(
          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          isComSaldo
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card hover:bg-muted/60",
        )}
        title="Pedidos em aberto ou com pagamento parcial (com saldo)"
      >
        Com saldo
      </Link>
      {ESTADOS_ORDEM.map((e) => {
        const href = buildVendasHref(searchParams, {
          estado: e,
          estadoAberto: null,
        });
        const active = estado === e;
        return (
          <Link
            key={e}
            href={href}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted/60",
            )}
          >
            {pedidoEstadoLabels[e]}
          </Link>
        );
      })}
    </div>
  );
}
