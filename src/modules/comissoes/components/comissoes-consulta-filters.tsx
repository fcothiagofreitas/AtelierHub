"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

type Props = {
  colaboradores: Option[];
  corretores: Option[];
  defaultDe: string;
  defaultAte: string;
  defaultColaboradorId: string;
  defaultCorretorId: string;
};

export function ComissoesConsultaFilters({
  colaboradores,
  corretores,
  defaultDe,
  defaultAte,
  defaultColaboradorId,
  defaultCorretorId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = new URLSearchParams();
    const de = String(fd.get("de") ?? "").trim();
    const ate = String(fd.get("ate") ?? "").trim();
    const colab = String(fd.get("colaboradorId") ?? "").trim();
    const corr = String(fd.get("corretorId") ?? "").trim();
    if (de) p.set("de", de);
    if (ate) p.set("ate", ate);
    if (colab) p.set("colaboradorId", colab);
    if (corr) p.set("corretorId", corr);
    startTransition(() => {
      router.push(`/admin/comissoes/consulta?${p.toString()}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="de">De</Label>
        <Input id="de" name="de" type="date" defaultValue={defaultDe} className="w-[11rem]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ate">Até</Label>
        <Input id="ate" name="ate" type="date" defaultValue={defaultAte} className="w-[11rem]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="colaboradorId">Vendedor</Label>
        <select
          id="colaboradorId"
          name="colaboradorId"
          defaultValue={defaultColaboradorId}
          className={cn(
            "flex h-9 w-full min-w-[12rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          )}
        >
          <option value="">Todos</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="corretorId">Corretor</Label>
        <select
          id="corretorId"
          name="corretorId"
          defaultValue={defaultCorretorId}
          className={cn(
            "flex h-9 w-full min-w-[12rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          )}
        >
          <option value="">Todos</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Filtrar"}
      </Button>
    </form>
  );
}
