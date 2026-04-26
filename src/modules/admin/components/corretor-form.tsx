"use client";

import { useActionState, useCallback, useRef, useState } from "react";
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
import { corretorFieldLabelsDivergingFromApi } from "@/lib/cnpj-field-match";
import type { CnpjLookupDto } from "@/lib/cnpj-lookup";
import { isValidCnpj } from "@/lib/doc-validation";
import {
  digitsOnly,
  formatCnpjDisplay,
  formatCpfDisplay,
  formatTelefoneBrDisplay,
} from "@/lib/masks-br";

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

  const [name, setName] = useState(() => corretor?.name ?? "");
  const [documentDigits, setDocumentDigits] = useState(() =>
    digitsOnly(corretor?.document ?? "", 14),
  );
  const [phoneDigits, setPhoneDigits] = useState(() =>
    digitsOnly(corretor?.phone ?? "", 11),
  );

  const initialDocDigits = digitsOnly(corretor?.document ?? "", 14);
  const lastFetchedCnpjRef = useRef<string | null>(
    initialDocDigits.length === 14 && isValidCnpj(initialDocDigits) ? initialDocDigits : null,
  );
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [cnpjDivergenceLabels, setCnpjDivergenceLabels] = useState<string[]>([]);

  const onDocumentBlur = useCallback(async () => {
    const d = documentDigits;
    if (d.length !== 14 || !isValidCnpj(d)) {
      lastFetchedCnpjRef.current = null;
      setCnpjLookupError(null);
      setCnpjDivergenceLabels([]);
      return;
    }
    if (lastFetchedCnpjRef.current === d) return;

    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    setCnpjLookupLoading(true);
    setCnpjLookupError(null);
    setCnpjDivergenceLabels([]);

    const snapshot = { name, phoneDigits };

    try {
      const res = await fetch(`/api/cnpj/${d}`, { method: "GET", signal: ac.signal });
      const json = (await res.json()) as { error?: string } & Partial<CnpjLookupDto>;
      if (!res.ok) {
        setCnpjLookupError(json.error ?? "Não foi possível consultar o CNPJ.");
        return;
      }
      if (!json.razaoSocial) {
        setCnpjLookupError("Resposta inválida do serviço de consulta.");
        return;
      }
      const dto: CnpjLookupDto = {
        razaoSocial: json.razaoSocial,
        nomeFantasia: json.nomeFantasia ?? "",
        endereco: json.endereco ?? "",
        telefoneDigits: json.telefoneDigits ?? "",
        email: json.email ?? "",
      };
      setCnpjDivergenceLabels(corretorFieldLabelsDivergingFromApi(snapshot, dto));

      setName(dto.razaoSocial || dto.nomeFantasia);
      if (dto.telefoneDigits) {
        setPhoneDigits(digitsOnly(dto.telefoneDigits, 11));
      }
      lastFetchedCnpjRef.current = d;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setCnpjLookupError("Falha de rede. Tente novamente.");
    } finally {
      if (fetchAbortRef.current === ac) {
        setCnpjLookupLoading(false);
      }
    }
  }, [documentDigits, name, phoneDigits]);

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
          <Label htmlFor="document">CPF / CNPJ</Label>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="document" value={documentDigits} />
              <Input
                id="document"
                className="max-w-xs"
                inputMode="numeric"
                autoComplete="off"
                placeholder="CPF ou CNPJ"
                value={
                  documentDigits.length > 11 ?
                    formatCnpjDisplay(documentDigits)
                  : formatCpfDisplay(documentDigits)
                }
                onChange={(e) => {
                  const next = digitsOnly(e.target.value, 14);
                  if (next !== lastFetchedCnpjRef.current) {
                    lastFetchedCnpjRef.current = null;
                  }
                  setDocumentDigits(next);
                  setCnpjLookupError(null);
                  setCnpjDivergenceLabels([]);
                }}
                onBlur={onDocumentBlur}
                disabled={cnpjLookupLoading}
                aria-busy={cnpjLookupLoading}
              />
              {cnpjLookupLoading ?
                <span className="text-xs text-muted-foreground">Consultando…</span>
              : null}
            </div>
            {cnpjLookupError ?
              <p className="text-xs text-destructive">{cnpjLookupError}</p>
            : null}
            {cnpjDivergenceLabels.length > 0 ?
              <p className="text-xs text-amber-900 dark:text-amber-200/90">
                Os dados informados diferem do cadastro público em:{" "}
                {cnpjDivergenceLabels.join(", ")}. Os campos foram atualizados conforme a Receita.
              </p>
            : null}
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.name)}
          />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <input type="hidden" name="phone" value={phoneDigits} />
          <Input
            id="phone"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={formatTelefoneBrDisplay(phoneDigits)}
            onChange={(e) => setPhoneDigits(digitsOnly(e.target.value, 11))}
          />
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
