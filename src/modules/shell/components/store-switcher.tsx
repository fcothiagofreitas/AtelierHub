"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type StoreOption = {
  id: string;
  name: string;
  kind: "ADMINISTRATIVE" | "OPERATIONAL";
};

type StoreSwitcherProps = {
  stores: StoreOption[];
  activeStoreId: string | null;
};

export function StoreSwitcher({ stores, activeStoreId }: StoreSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (stores.length <= 1) return null;

  async function handleChange(storeId: string | null) {
    if (!storeId) return;
    const form = new FormData();
    form.append("storeId", storeId);

    await fetch("/api/store/switch", { method: "POST", body: form });

    startTransition(() => {
      router.refresh();
    });
  }

  const activeStore = stores.find((s) => s.id === activeStoreId);

  return (
    <Select
      value={activeStoreId ?? undefined}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-8 w-auto min-w-[140px] gap-1.5 rounded-md border-border bg-background text-sm">
        <span className="flex-1 truncate text-left text-sm">
          {activeStore ? (
            <span className="flex items-center gap-1.5">
              {activeStore.name}
              {activeStore.kind === "ADMINISTRATIVE" && (
                <span className="text-[10px] text-muted-foreground">Admin</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Selecionar loja</span>
          )}
        </span>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            <span className="flex items-center gap-2">
              {store.name}
              {store.kind === "ADMINISTRATIVE" && (
                <span className="text-[10px] text-muted-foreground">Admin</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
