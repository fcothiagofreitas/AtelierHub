"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { CorretorPaymentMethod } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInputBrl } from "@/components/ui/money-input-brl";
import { corretorPaymentLabels } from "@/lib/corretor-labels";
import {
  upsertCorretor,
  type CorretorActionResult,
} from "@/modules/admin/actions/corretor-actions";

const PAYMENT_METHODS: CorretorPaymentMethod[] = ["PIX", "CASH", "BANK_TRANSFER"];

type CorretorFormProps = {
  corretor?: {
    id: string;
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    commissionPercent: number;
    paymentMethod: CorretorPaymentMethod;
    pixKey: string | null;
    bankName: string | null;
    bankBranch: string | null;
    bankAccount: string | null;
    notes: string | null;
    creditLimitConsignado: { toString(): string } | null;
    isActive: boolean;
    isBlocked: boolean;
  } | null;
};

export function CorretorForm({ corretor }: CorretorFormProps) {
  const [state, action, isPending] = useActionState<CorretorActionResult | null, FormData>(
    upsertCorretor,
    null,
  );

  const creditLimitReais =
    corretor?.creditLimitConsignado != null
      ? Number(corretor.creditLimitConsignado.toString())
      : null;

  return (
    <form action={action} className="space-y-6">
      {corretor?.id && <input type="hidden" name="id" value={corretor.id} />}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={corretor?.name ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.name)}
          />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document">CPF / CNPJ</Label>
          <Input id="document" name="document" defaultValue={corretor?.document ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={corretor?.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={corretor?.email ?? ""}
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commissionPercent">Comissão (%)</Label>
          <Input
            id="commissionPercent"
            name="commissionPercent"
            type="number"
            step="0.01"
            min={0}
            max={100}
            required
            defaultValue={corretor?.commissionPercent ?? 0}
            aria-invalid={Boolean(state?.fieldErrors?.commissionPercent)}
          />
          {state?.fieldErrors?.commissionPercent && (
            <p className="text-xs text-destructive">{state.fieldErrors.commissionPercent}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paymentMethod">Forma de recebimento</Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue={corretor?.paymentMethod ?? "PIX"}
          className="flex h-8 w-full max-w-md rounded-lg border border-input bg-transparent ps-2.5 pe-10 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {corretorPaymentLabels[m]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pixKey">Chave Pix (se aplicável)</Label>
          <Input id="pixKey" name="pixKey" defaultValue={corretor?.pixKey ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankName">Banco</Label>
          <Input id="bankName" name="bankName" defaultValue={corretor?.bankName ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankBranch">Agência</Label>
          <Input id="bankBranch" name="bankBranch" defaultValue={corretor?.bankBranch ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bankAccount">Conta</Label>
          <Input id="bankAccount" name="bankAccount" defaultValue={corretor?.bankAccount ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" defaultValue={corretor?.notes ?? ""} />
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
        <Label htmlFor="creditLimitConsignado">Limite de crédito (consignado)</Label>
        <MoneyInputBrl
          key={corretor?.id ?? "new"}
          id="creditLimitConsignado"
          name="creditLimitConsignado"
          defaultReais={creditLimitReais}
          placeholder="Ilimitado"
          invalid={Boolean(state?.fieldErrors?.creditLimitConsignado)}
        />
        <p className="text-xs text-muted-foreground">
          Teto de exposição em aberto para operações em consignado. Deixe vazio para sem limite
          cadastral (ilimitado até o PDV aplicar outras regras).
        </p>
        {state?.fieldErrors?.creditLimitConsignado && (
          <p className="text-xs text-destructive">{state.fieldErrors.creditLimitConsignado}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={corretor?.isActive ?? true}
            className="rounded border-input"
          />
          Cadastro ativo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isBlocked"
            defaultChecked={corretor?.isBlocked ?? false}
            className="rounded border-input"
          />
          Bloqueado para operação
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Link href="/admin/corretores" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
