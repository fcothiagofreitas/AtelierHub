import { Handshake, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { toggleCorretorBlocked } from "@/modules/admin/actions/corretor-actions";
import { ConfirmActionButton } from "./confirm-action-button";

type CorretorRow = {
  id: string;
  name: string;
  email: string | null;
  commissionPercent: number;
  creditLimitConsignado: { toString(): string } | null;
  isActive: boolean;
  isBlocked: boolean;
};

type CorretorTableProps = {
  corretores: CorretorRow[];
  search: string;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CorretorTable({ corretores, search }: CorretorTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Corretores</h2>
          <p className="text-sm text-muted-foreground">
            {corretores.length}{" "}
            {corretores.length === 1 ? "cadastro" : "cadastros"}{" "}
            {search
              ? `encontrado${corretores.length !== 1 ? "s" : ""} para "${search}"`
              : "no total"}
          </p>
        </div>
        <Link href="/admin/corretores/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" />
          Novo corretor
        </Link>
      </div>

      {corretores.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Handshake className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "Nenhum corretor encontrado" : "Nenhum corretor cadastrado ainda"}
          </p>
          {!search && (
            <Link
              href="/admin/corretores/new"
              className={cn(buttonVariants({ variant: "link" }), "mt-2 text-sm")}
            >
              Cadastrar primeiro corretor
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Comissão</th>
                <th className="px-4 py-3 text-left font-medium">Limite de crédito</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {corretores.map((c) => (
                <tr key={c.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.email && (
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.commissionPercent.toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                    %
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.creditLimitConsignado == null
                      ? "Ilimitado"
                      : money.format(Number(c.creditLimitConsignado.toString()))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {c.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {c.isBlocked && (
                        <Badge variant="destructive" className="text-xs">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/corretores/${c.id}/edit`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ConfirmActionButton
                        title={c.isBlocked ? "Desbloquear corretor?" : "Bloquear corretor?"}
                        description={
                          c.isBlocked
                            ? "O corretor voltará a poder ser usado na operação quando o PDV existir."
                            : "O corretor ficará marcado como bloqueado para a operação."
                        }
                        actionLabel={c.isBlocked ? "Desbloquear" : "Bloquear"}
                        triggerLabel={c.isBlocked ? "Desbloquear" : "Bloquear"}
                        triggerClassName="text-xs"
                        formAction={toggleCorretorBlocked}
                        hiddenFields={{ id: c.id }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
