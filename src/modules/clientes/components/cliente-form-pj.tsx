"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { Cliente } from "@prisma/client";
import { cn } from "@/lib/utils";
import { digitsOnly, formatCnpjDisplay, formatTelefoneBrDisplay } from "@/lib/masks-br";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInputBrl } from "@/components/ui/money-input-brl";
import {
  upsertClientePj,
  type ClienteActionResult,
} from "@/modules/clientes/actions/cliente-actions";
import { CorretorSelect } from "@/modules/clientes/components/corretor-select";
import { clientePjFieldLabelsDivergingFromApi } from "@/lib/cnpj-field-match";
import type { CnpjLookupDto } from "@/lib/cnpj-lookup";
import { isValidCnpj } from "@/lib/doc-validation";

type CorretorOpt = { id: string; name: string };

type Props = {
  storeId: string;
  corretores: CorretorOpt[];
  cliente?: Cliente & { corretor: { name: string } | null };
  onCancel?: () => void;
  redirectAfterSave?: string;
};

export function ClienteFormPj({
  storeId,
  corretores,
  cliente,
  onCancel,
  redirectAfterSave,
}: Props) {
  const [state, action, pending] = useActionState<ClienteActionResult | null, FormData>(
    upsertClientePj,
    null,
  );

  const [fantasia, setFantasia] = useState(() => cliente?.fantasia ?? "");
  const [razaoSocial, setRazaoSocial] = useState(() => cliente?.razaoSocial ?? "");
  const [cnpjDigits, setCnpjDigits] = useState(() => digitsOnly(cliente?.cnpj ?? "", 14));
  const [ieIsento, setIeIsento] = useState(() => cliente?.ieIsento ?? false);
  const [ie, setIe] = useState(() => cliente?.ie ?? "");
  const [endereco, setEndereco] = useState(() => cliente?.endereco ?? "");
  const [telefoneDigits, setTelefoneDigits] = useState(() =>
    digitsOnly(cliente?.telefone ?? "", 11),
  );
  const [email, setEmail] = useState(() => cliente?.email ?? "");
  const [responsavelNome, setResponsavelNome] = useState(() => cliente?.responsavelNome ?? "");
  const [responsavelFoneDigits, setResponsavelFoneDigits] = useState(() =>
    digitsOnly(cliente?.responsavelFone ?? "", 11),
  );
  const [corretorId, setCorretorId] = useState(() => cliente?.corretorId ?? "");
  const [isActive, setIsActive] = useState(() => cliente?.isActive ?? true);
  const [isBlocked, setIsBlocked] = useState(() => cliente?.isBlocked ?? false);

  const initialCnpjDigits = digitsOnly(cliente?.cnpj ?? "", 14);
  const lastFetchedCnpjRef = useRef<string | null>(
    initialCnpjDigits.length === 14 && isValidCnpj(initialCnpjDigits) ? initialCnpjDigits : null,
  );
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [cnpjLookupLoading, setCnpjLookupLoading] = useState(false);
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [cnpjDivergenceLabels, setCnpjDivergenceLabels] = useState<string[]>([]);

  const onCnpjBlur = useCallback(async () => {
    const d = cnpjDigits;
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

    const snapshot = {
      razaoSocial,
      fantasia,
      endereco,
      telefoneDigits,
      email,
    };

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
      const diverging = clientePjFieldLabelsDivergingFromApi(snapshot, dto);
      setCnpjDivergenceLabels(diverging);

      setRazaoSocial(dto.razaoSocial);
      setFantasia(dto.nomeFantasia || dto.razaoSocial);
      setEndereco(dto.endereco);
      if (dto.telefoneDigits) {
        setTelefoneDigits(digitsOnly(dto.telefoneDigits, 11));
      }
      if (dto.email) setEmail(dto.email);
      lastFetchedCnpjRef.current = d;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setCnpjLookupError("Falha de rede. Tente novamente.");
    } finally {
      if (fetchAbortRef.current === ac) {
        setCnpjLookupLoading(false);
      }
    }
  }, [cnpjDigits, razaoSocial, fantasia, endereco, telefoneDigits, email]);

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
          <Label htmlFor="cnpj">CNPJ</Label>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="cnpj" value={cnpjDigits} />
              <Input
                id="cnpj"
                className="max-w-xs"
                inputMode="numeric"
                autoComplete="off"
                placeholder="00.000.000/0000-00"
                value={formatCnpjDisplay(cnpjDigits)}
                onChange={(e) => {
                  const next = digitsOnly(e.target.value, 14);
                  if (next !== lastFetchedCnpjRef.current) {
                    lastFetchedCnpjRef.current = null;
                  }
                  setCnpjDigits(next);
                  setCnpjLookupError(null);
                  setCnpjDivergenceLabels([]);
                }}
                onBlur={onCnpjBlur}
                disabled={cnpjLookupLoading}
                aria-busy={cnpjLookupLoading}
                aria-invalid={Boolean(state?.fieldErrors?.cnpj)}
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
          {state?.fieldErrors?.cnpj && (
            <p className="text-xs text-destructive">{state.fieldErrors.cnpj}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fantasia">Nome fantasia</Label>
          <Input
            id="fantasia"
            name="fantasia"
            required
            value={fantasia}
            onChange={(e) => setFantasia(e.target.value)}
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
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.razaoSocial)}
          />
          {state?.fieldErrors?.razaoSocial && (
            <p className="text-xs text-destructive">{state.fieldErrors.razaoSocial}</p>
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
            value={ie}
            onChange={(e) => setIe(e.target.value)}
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
          <input type="hidden" name="telefone" value={telefoneDigits} />
          <Input
            id="telefone"
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={responsavelNome}
            onChange={(e) => setResponsavelNome(e.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.responsavelNome)}
          />
          {state?.fieldErrors?.responsavelNome && (
            <p className="text-xs text-destructive">{state.fieldErrors.responsavelNome}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responsavelFone">Telefone do responsável</Label>
          <input type="hidden" name="responsavelFone" value={responsavelFoneDigits} />
          <Input
            id="responsavelFone"
            required
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={formatTelefoneBrDisplay(responsavelFoneDigits)}
            onChange={(e) => setResponsavelFoneDigits(digitsOnly(e.target.value, 11))}
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
          value={corretorId}
          onValueChange={setCorretorId}
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
