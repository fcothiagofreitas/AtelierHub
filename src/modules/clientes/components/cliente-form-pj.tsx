"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Cliente } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInputBrl } from "@/components/ui/money-input-brl";
import {
  upsertClientePj,
  type ClienteActionResult,
} from "@/modules/clientes/actions/cliente-actions";
import { CorretorSelect } from "@/modules/clientes/components/corretor-select";

type CorretorOpt = { id: string; name: string };

type Props = {
  storeId: string;
  corretores: CorretorOpt[];
  cliente?: Cliente & { corretor: { name: string } | null };
};

export function ClienteFormPj({ storeId, corretores, cliente }: Props) {
  const [state, action, pending] = useActionState<ClienteActionResult | null, FormData>(
    upsertClientePj,
    null,
  );

  const [ieIsento, setIeIsento] = useState(cliente?.ieIsento ?? false);

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
          <Label htmlFor="fantasia">Nome fantasia</Label>
          <Input
            id="fantasia"
            name="fantasia"
            required
            defaultValue={cliente?.fantasia ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.fantasia)}
          />
          {state?.fieldErrors?.fantasia && (
            <p className="text-xs text-destructive">{state.fieldErrors.fantasia}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="razaoSocial">Razão social</Label>
          <Input
            id="razaoSocial"
            name="razaoSocial"
            required
            defaultValue={cliente?.razaoSocial ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.razaoSocial)}
          />
          {state?.fieldErrors?.razaoSocial && (
            <p className="text-xs text-destructive">{state.fieldErrors.razaoSocial}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            inputMode="numeric"
            placeholder="Somente números"
            defaultValue={cliente?.cnpj ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.cnpj)}
          />
          {state?.fieldErrors?.cnpj && (
            <p className="text-xs text-destructive">{state.fieldErrors.cnpj}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <input type="hidden" name="ieIsento" value={ieIsento ? "on" : ""} />
          <label className="flex items-center gap-2 text-sm pt-6">
            <input
              type="checkbox"
              checked={ieIsento}
              onChange={(e) => setIeIsento(e.target.checked)}
              className="rounded border-input"
            />
            IE isento
          </label>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ie">Inscrição estadual</Label>
          <Input
            id="ie"
            name="ie"
            disabled={ieIsento}
            defaultValue={cliente?.ie ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.ie)}
          />
          {state?.fieldErrors?.ie && (
            <p className="text-xs text-destructive">{state.fieldErrors.ie}</p>
          )}
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
            defaultValue={cliente?.email ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responsavelNome">Responsável</Label>
          <Input
            id="responsavelNome"
            name="responsavelNome"
            required
            defaultValue={cliente?.responsavelNome ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.responsavelNome)}
          />
          {state?.fieldErrors?.responsavelNome && (
            <p className="text-xs text-destructive">{state.fieldErrors.responsavelNome}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responsavelFone">Telefone do responsável</Label>
          <Input
            id="responsavelFone"
            name="responsavelFone"
            required
            defaultValue={cliente?.responsavelFone ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.responsavelFone)}
          />
          {state?.fieldErrors?.responsavelFone && (
            <p className="text-xs text-destructive">{state.fieldErrors.responsavelFone}</p>
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
        <Label htmlFor="creditLimitConsignado-pj">Limite de crédito</Label>
        <MoneyInputBrl
          key={(cliente?.id ?? "new") + "-pj"}
          id="creditLimitConsignado-pj"
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
