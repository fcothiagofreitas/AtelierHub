"use client";

import { Building2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveStore } from "@/modules/auth/actions/select-store";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type StoreSwitcherProps = {
  currentStoreId: string | null;
  stores: StoreOption[];
};

export function StoreSwitcher({
  currentStoreId,
  stores,
}: StoreSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentStoreId ?? stores[0]?.id ?? "");

  function handleValueChange(nextValue: string) {
    setValue(nextValue);

    startTransition(async () => {
      const result = await setActiveStore(nextValue);

      if (result?.ok) {
        router.refresh();
        return;
      }

      setValue(currentStoreId ?? stores[0]?.id ?? "");
    });
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <div className="min-w-[14rem] max-w-[16rem]">
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white text-left">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-sm bg-slate-100 text-slate-600">
              {isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Building2 className="size-3.5" />
              )}
            </span>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Operacao
              </p>
              <div className="truncate text-sm font-medium text-slate-900">
                <SelectValue placeholder="Selecionar loja" />
              </div>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Lojas acessiveis</SelectLabel>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                <div className="flex flex-col">
                  <span>{store.name}</span>
                  <span className="text-xs text-slate-400">
                    {store.kind === "ADMINISTRATIVE"
                      ? "Administrativo"
                      : "Loja operacional"}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
