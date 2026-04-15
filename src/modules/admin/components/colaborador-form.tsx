"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { roleLabels } from "@/lib/roles";
import {
  upsertColaborador,
  type ColaboradorActionResult,
} from "@/modules/admin/actions/colaborador-actions";

type StoreOption = { id: string; name: string; kind: string };

type ColaboradorFormProps = {
  colaborador?: {
    id: string;
    name: string;
    cpf: string | null;
    phone: string | null;
    role: UserRole;
    minCommission: number;
    admissionAt: Date | null;
    isActive: boolean;
    userId: string | null;
    user: { email: string } | null;
    stores: { storeId: string; isDefault: boolean }[];
  } | null;
  availableStores: StoreOption[];
};

const ROLES: UserRole[] = [
  "ADMIN_DA_MARCA",
  "ADMINISTRATIVO",
  "GERENTE_LOJA",
  "VENDEDOR",
];

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ColaboradorForm({ colaborador, availableStores }: ColaboradorFormProps) {
  const [state, action, isPending] = useActionState<
    ColaboradorActionResult | null,
    FormData
  >(upsertColaborador, null);

  const initialStoreIds = colaborador?.stores.map((s) => s.storeId) ?? [];
  const initialDefaultId =
    colaborador?.stores.find((s) => s.isDefault)?.storeId ??
    initialStoreIds[0] ??
    "";

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    colaborador?.role ?? "VENDEDOR",
  );
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(initialStoreIds);
  const [defaultStoreId, setDefaultStoreId] = useState<string>(initialDefaultId);
  const [hasSystemAccess, setHasSystemAccess] = useState<boolean>(
    Boolean(colaborador?.userId),
  );

  const isEditing = Boolean(colaborador?.id);

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) => {
      const next = prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId];
      if (!next.includes(defaultStoreId)) setDefaultStoreId(next[0] ?? "");
      return next;
    });
  }

  const selectedStores = availableStores.filter((s) =>
    selectedStoreIds.includes(s.id),
  );

  return (
    <form action={action} className="space-y-6">
      {colaborador?.id && (
        <input type="hidden" name="id" value={colaborador.id} />
      )}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Dados pessoais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            name="name"
            defaultValue={colaborador?.name ?? ""}
            placeholder="Ex.: Camila Rocha"
            className={cn(state?.fieldErrors?.name && "border-destructive")}
            required
          />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            name="cpf"
            defaultValue={colaborador?.cpf ?? ""}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={colaborador?.phone ?? ""}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admissionAt">Data de admissão</Label>
          <Input
            id="admissionAt"
            name="admissionAt"
            type="date"
            defaultValue={toDateInputValue(colaborador?.admissionAt)}
          />
        </div>
      </div>

      {/* Cargo */}
      <div className="space-y-2">
        <Label>Cargo</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <label
              key={role}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={selectedRole === role}
                onChange={() => setSelectedRole(role)}
              />
              <span>{roleLabels[role]}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.role && (
          <p className="text-xs text-destructive">{state.fieldErrors.role}</p>
        )}
      </div>

      {/* Comissão mínima — só para Vendedor */}
      {selectedRole === "VENDEDOR" && (
        <div className="space-y-1.5">
          <Label htmlFor="minCommission">Comissão mínima (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="minCommission"
              name="minCommission"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={colaborador?.minCommission ?? 0}
              className="max-w-[140px]"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Percentual base antes de metas.
          </p>
        </div>
      )}

      {/* Lojas */}
      <div className="space-y-2">
        <Label>Lojas</Label>
        <div className="rounded-lg border divide-y">
          {availableStores.map((store) => (
            <label
              key={store.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <input
                type="checkbox"
                name="storeIds"
                value={store.id}
                checked={selectedStoreIds.includes(store.id)}
                onChange={() => toggleStore(store.id)}
                className="size-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{store.name}</p>
                <p className="text-xs text-muted-foreground">
                  {store.kind === "ADMINISTRATIVE" ? "Administrativa" : "Operacional"}
                </p>
              </div>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.storeIds && (
          <p className="text-xs text-destructive">{state.fieldErrors.storeIds}</p>
        )}
      </div>

      {/* Loja padrão — só aparece se tem lojas selecionadas */}
      {selectedStores.length > 0 && (
        <div className="space-y-1.5">
          <Label>Loja padrão</Label>
          <Select
            name="defaultStoreId"
            value={defaultStoreId}
            onValueChange={(v) => v && setDefaultStoreId(v)}
          >
            <SelectTrigger>
              <span className="flex-1 truncate text-left text-sm">
                {selectedStores.find((s) => s.id === defaultStoreId)?.name ?? (
                  <span className="text-muted-foreground">Selecione a loja padrão</span>
                )}
              </span>
            </SelectTrigger>
            <SelectContent>
              {selectedStores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Contexto aberto automaticamente após o login.
          </p>
          {state?.fieldErrors?.defaultStoreId && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.defaultStoreId}
            </p>
          )}
        </div>
      )}

      {selectedStores.length === 0 && (
        <input type="hidden" name="defaultStoreId" value="" />
      )}

      {/* Ativo */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/40 transition-colors">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={colaborador?.isActive ?? true}
          className="size-4 rounded"
        />
        <div>
          <p className="text-sm font-medium">Colaborador ativo</p>
          <p className="text-xs text-muted-foreground">
            Inativos não aparecem em seleções operacionais nem conseguem logar
          </p>
        </div>
      </label>

      {/* Acesso ao sistema */}
      <div className="rounded-lg border overflow-hidden">
        <label className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-muted/30 transition-colors">
          <input
            type="checkbox"
            name="hasSystemAccess"
            checked={hasSystemAccess}
            onChange={(e) => setHasSystemAccess(e.target.checked)}
            className="size-4 rounded"
          />
          <div>
            <p className="text-sm font-medium">Dar acesso ao sistema</p>
            <p className="text-xs text-muted-foreground">
              Cria login para que esta pessoa acesse o AtelierHub
            </p>
          </div>
        </label>

        {hasSystemAccess && (
          <div className="border-t bg-muted/20 px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail de acesso</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={colaborador?.user?.email ?? ""}
                placeholder="email@empresa.com"
                className={cn(state?.fieldErrors?.email && "border-destructive")}
              />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                {isEditing && colaborador?.userId
                  ? "Nova senha (deixe em branco para manter)"
                  : "Senha inicial"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={
                  isEditing && colaborador?.userId
                    ? "••••••••"
                    : "Mínimo 8 caracteres"
                }
                className={cn(state?.fieldErrors?.password && "border-destructive")}
              />
              {state?.fieldErrors?.password && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.password}
                </p>
              )}
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar a senha padrão do sistema.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending || selectedStores.length === 0}
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar colaborador"}
        </Button>
        <Link
          href="/admin/colaboradores"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
