"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertStore,
  type StoreActionResult,
} from "@/modules/admin/actions/store-actions";

type StoreFormProps = {
  store?: {
    id: string;
    name: string;
    kind: "ADMINISTRATIVE" | "OPERATIONAL";
    isActive: boolean;
  } | null;
};

const kindOptions = [
  {
    value: "OPERATIONAL",
    label: "Operacional",
    description: "Loja de atendimento ao cliente e PDV",
  },
  {
    value: "ADMINISTRATIVE",
    label: "Administrativa",
    description: "Visão consolidada, transferências e gestão central",
  },
] as const;

export function StoreForm({ store }: StoreFormProps) {
  const [state, action, isPending] = useActionState<
    StoreActionResult | null,
    FormData
  >(upsertStore, null);

  const isEditing = Boolean(store?.id);

  return (
    <form action={action} className="space-y-5">
      {store?.id && <input type="hidden" name="id" value={store.id} />}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome da loja</Label>
        <Input
          id="name"
          name="name"
          defaultValue={store?.name ?? ""}
          placeholder="Ex.: Loja Aldeota"
          className={cn(state?.fieldErrors?.name && "border-destructive")}
          required
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          O slug é gerado automaticamente a partir do nome.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tipo de loja</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {kindOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={opt.value}
                defaultChecked={(store?.kind ?? "OPERATIONAL") === opt.value}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">
                  {opt.description}
                </p>
              </div>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.kind && (
          <p className="text-xs text-destructive">{state.fieldErrors.kind}</p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/40 transition-colors">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={store?.isActive ?? true}
          className="size-4 rounded"
        />
        <div>
          <p className="text-sm font-medium">Loja ativa</p>
          <p className="text-xs text-muted-foreground">
            Lojas inativas não aparecem para seleção de contexto
          </p>
        </div>
      </label>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar loja"}
        </Button>
        <Link
          href="/admin/lojas"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
