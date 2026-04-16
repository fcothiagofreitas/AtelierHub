import { Pencil, User } from "lucide-react";
import Link from "next/link";
import type { Cliente, ClienteTipo } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { toggleClienteBlocked } from "@/modules/clientes/actions/cliente-actions";
import { ConfirmActionButton } from "@/modules/admin/components/confirm-action-button";
import { ClienteNovoDialog } from "@/modules/clientes/components/cliente-novo-dialog";

type Row = Cliente & {
  corretor: { name: string } | null;
};

type CorretorOpt = { id: string; name: string };

type Props = {
  clientes: Row[];
  search: string;
  storeId: string;
  corretores: CorretorOpt[];
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function displayName(c: Row) {
  if (c.tipo === "PF") return c.nome ?? "—";
  return c.fantasia ?? c.razaoSocial ?? "—";
}

function displayDoc(c: Row) {
  if (c.tipo === "PF") return formatCpf(c.cpf);
  return formatCnpj(c.cnpj);
}

export function ClienteTable({ clientes, search, storeId, corretores }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {clientes.length}{" "}
            {clientes.length === 1 ? "cadastro" : "cadastros"}{" "}
            {search
              ? `encontrado${clientes.length !== 1 ? "s" : ""} para "${search}"`
              : "nesta loja"}
          </p>
        </div>
        <ClienteNovoDialog storeId={storeId} corretores={corretores} trigger="toolbar" />
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <User className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "Nenhum cliente encontrado" : "Nenhum cliente nesta loja ainda"}
          </p>
          {!search && (
            <div className="mt-4 flex justify-center">
              <ClienteNovoDialog storeId={storeId} corretores={corretores} trigger="empty" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Documento</th>
                <th className="px-4 py-3 text-left font-medium">Telefone</th>
                <th className="px-4 py-3 text-left font-medium">Crédito</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientes.map((c) => (
                <tr key={c.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{displayName(c)}</p>
                    {c.corretor && (
                      <p className="text-[11px] text-muted-foreground">
                        Corretor: {c.corretor.name}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tipoLabel(c.tipo)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {displayDoc(c)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.creditLimit == null ? "Ilimitado" : money.format(Number(c.creditLimit))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">
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
                        href={
                          c.tipo === "PF"
                            ? `/clientes/${c.id}/edit/pf`
                            : `/clientes/${c.id}/edit/pj`
                        }
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ConfirmActionButton
                        title={c.isBlocked ? "Desbloquear cliente?" : "Bloquear cliente?"}
                        description={
                          c.isBlocked
                            ? "O cliente poderá voltar a operar conforme regras de crédito."
                            : "O cliente ficará bloqueado para operação / crédito."
                        }
                        actionLabel={c.isBlocked ? "Desbloquear" : "Bloquear"}
                        triggerLabel={c.isBlocked ? "Desbloquear" : "Bloquear"}
                        triggerClassName="text-xs"
                        formAction={toggleClienteBlocked}
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

function tipoLabel(t: ClienteTipo) {
  return t === "PF" ? "Pessoa física" : "Pessoa jurídica";
}

function formatCpf(raw: string | null) {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return raw;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCnpj(raw: string | null) {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length !== 14) return raw;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
