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
  upsertUser,
  type UserActionResult,
} from "@/modules/admin/actions/user-actions";

type StoreOption = { id: string; name: string; kind: string };

type UserFormProps = {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
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

export function UserForm({ user, availableStores }: UserFormProps) {
  const [state, action, isPending] = useActionState<
    UserActionResult | null,
    FormData
  >(upsertUser, null);

  const initialStoreIds = user?.stores.map((s) => s.storeId) ?? [];
  const initialDefaultId =
    user?.stores.find((s) => s.isDefault)?.storeId ??
    initialStoreIds[0] ??
    "";

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(initialStoreIds);
  const [defaultStoreId, setDefaultStoreId] = useState<string>(initialDefaultId);

  const isEditing = Boolean(user?.id);

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) => {
      const next = prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId];

      if (!next.includes(defaultStoreId)) {
        setDefaultStoreId(next[0] ?? "");
      }
      return next;
    });
  }

  const selectedStores = availableStores.filter((s) =>
    selectedStoreIds.includes(s.id),
  );

  return (
    <form action={action} className="space-y-5">
      {user?.id && <input type="hidden" name="id" value={user.id} />}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            defaultValue={user?.name ?? ""}
            placeholder="Ex.: Camila Rocha"
            className={cn(state?.fieldErrors?.name && "border-destructive")}
            required
          />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user?.email ?? ""}
            placeholder="voce@empresa.com"
            className={cn(state?.fieldErrors?.email && "border-destructive")}
            required
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          {isEditing
            ? "Nova senha (deixe em branco para manter)"
            : "Senha inicial"}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={isEditing ? "••••••••" : "Mínimo 8 caracteres"}
          className={cn(state?.fieldErrors?.password && "border-destructive")}
        />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Perfil</Label>
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
                defaultChecked={(user?.role ?? "VENDEDOR") === role}
              />
              <span>{roleLabels[role]}</span>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.role && (
          <p className="text-xs text-destructive">{state.fieldErrors.role}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Lojas liberadas</Label>
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
                  {store.kind === "ADMINISTRATIVE"
                    ? "Administrativa"
                    : "Operacional"}
                </p>
              </div>
            </label>
          ))}
        </div>
        {state?.fieldErrors?.storeIds && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.storeIds}
          </p>
        )}
      </div>

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
            Loja que abre automaticamente após o login.
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

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/40 transition-colors">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user?.isActive ?? true}
          className="size-4 rounded"
        />
        <div>
          <p className="text-sm font-medium">Usuário ativo</p>
          <p className="text-xs text-muted-foreground">
            Usuários inativos não conseguem fazer login
          </p>
        </div>
      </label>

      <div className="flex gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending || selectedStores.length === 0}
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar usuário"}
        </Button>
        <Link
          href="/admin/usuarios"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
