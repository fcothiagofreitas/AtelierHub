"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Cliente } from "@prisma/client";
import { cn } from "@/lib/utils";
import { digitsOnly, formatCpfDisplay, formatTelefoneBrDisplay } from "@/lib/masks-br";
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
  onCancel?: () => void;
  /** Após salvar (ex.: voltar ao PDV em `/vendas?pdv=1`). Só aceito no servidor se o path for `/vendas`. */
  redirectAfterSave?: string;
};

export function ClienteFormPf({
  storeId,
  corretores,
  cliente,
  onCancel,
  redirectAfterSave,
}: Props) {
  const [state, action, pending] = useActionState<ClienteActionResult | null, FormData>(
    upsertClientePf,
    null,
  );

  const [nome, setNome] = useState(() => cliente?.nome ?? "");
  const [cpfDigits, setCpfDigits] = useState(() => digitsOnly(cliente?.cpf ?? "", 11));
  const [aniversario, setAniversario] = useState(() => dateToInput(cliente?.aniversario ?? null));
  const [endereco, setEndereco] = useState(() => cliente?.endereco ?? "");
  const [telefoneDigits, setTelefoneDigits] = useState(() =>
    digitsOnly(cliente?.telefone ?? "", 11),
  );
  const [email, setEmail] = useState(() => cliente?.email ?? "");
  const [corretorId, setCorretorId] = useState(() => cliente?.corretorId ?? "");
  const [isActive, setIsActive] = useState(() => cliente?.isActive ?? true);
  const [isBlocked, setIsBlocked] = useState(() => cliente?.isBlocked ?? false);

  const creditReais =
    cliente?.creditLimit != null ? Number(cliente.creditLimit.toString()) : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="storeId" value={storeId} />
      {redirectAfterSave ? (
        <input type="hidden" name="redirectAfterSave" value={redirectAfterSave} />
      ) : null}
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
            value={nome}
            onChange={(e) => setNome(e.target.value)}
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
            autoComplete="off"
            placeholder="000.000.000-00"
            value={formatCpfDisplay(cpfDigits)}
            onChange={(e) => setCpfDigits(digitsOnly(e.target.value, 11))}
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
            value={aniversario}
            onChange={(e) => setAniversario(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            name="endereco"
            required
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
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
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={formatTelefoneBrDisplay(telefoneDigits)}
            onChange={(e) => setTelefoneDigits(digitsOnly(e.target.value, 11))}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          value={corretorId}
          onValueChange={setCorretorId}
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
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-input"
          />
          Cadastro ativo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isBlocked"
            checked={isBlocked}
            onChange={(e) => setIsBlocked(e.target.checked)}
            className="rounded border-input"
          />
          Bloqueado (crédito / operação)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <Link href="/clientes" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}

function dateToInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
