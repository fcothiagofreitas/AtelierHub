"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Cliente } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInputBrl } from "@/components/ui/money-input-brl";
import {
  upsertClientePf,
  type ClienteActionResult,
} from "@/modules/clientes/actions/cliente-actions";
import { CorretorSelect } from "@/modules/clientes/components/corretor-select";

type CorretorOpt = { id: string; name: string };

type Props = {
  storeId: string;
  corretores: CorretorOpt[];
  cliente?: Cliente & { corretor: { name: string } | null };
};

export function ClienteFormPf({ storeId, corretores, cliente }: Props) {
  const [state, action, pending] = useActionState<ClienteActionResult | null, FormData>(
    upsertClientePf,
    null,
  );

  const creditReais =
    cliente?.creditLimit != null ? Number(cliente.creditLimit.toString()) : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="storeId" value={storeId} />
      {cliente?.id && <input type="hidden" name="id" value={cliente.id} />}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.nome)}
          />
          {state?.fieldErrors?.nome && (
            <p className="text-xs text-destructive">{state.fieldErrors.nome}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            placeholder="Somente números"
            defaultValue={cliente?.cpf ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.cpf)}
          />
          {state?.fieldErrors?.cpf && (
            <p className="text-xs text-destructive">{state.fieldErrors.cpf}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aniversario">Aniversário</Label>
          <Input
            id="aniversario"
            name="aniversario"
            type="date"
            defaultValue={dateToInput(cliente?.aniversario ?? null)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            name="endereco"
            required
            defaultValue={cliente?.endereco ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.endereco)}
          />
          {state?.fieldErrors?.endereco && (
            <p className="text-xs text-destructive">{state.fieldErrors.endereco}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            name="telefone"
            required
            defaultValue={cliente?.telefone ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.telefone)}
          />
          {state?.fieldErrors?.telefone && (
            <p className="text-xs text-destructive">{state.fieldErrors.telefone}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={cliente?.email ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Corretor (opcional)</Label>
        <CorretorSelect
          options={corretores}
          defaultValue={cliente?.corretorId ?? ""}
        />
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
        <Label htmlFor="creditLimitConsignado">Limite de crédito</Label>
        <MoneyInputBrl
          key={cliente?.id ?? "new-pf"}
          id="creditLimitConsignado"
          name="creditLimitConsignado"
          defaultReais={creditReais}
          placeholder="Ilimitado"
          invalid={Boolean(state?.fieldErrors?.creditLimitConsignado)}
        />
        <p className="text-xs text-muted-foreground">Vazio = sem limite cadastral.</p>
        {state?.fieldErrors?.creditLimitConsignado && (
          <p className="text-xs text-destructive">{state.fieldErrors.creditLimitConsignado}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={cliente?.isActive ?? true}
            className="rounded border-input"
          />
          Cadastro ativo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isBlocked"
            defaultChecked={cliente?.isBlocked ?? false}
            className="rounded border-input"
          />
          Bloqueado (crédito / operação)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <Link href="/clientes" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function dateToInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
