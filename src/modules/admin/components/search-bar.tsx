"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchBarProps = {
  placeholder: string;
  base: string;
  defaultValue?: string;
};

export function SearchBar({ placeholder, base, defaultValue }: SearchBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    startTransition(() => {
      router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base);
    });
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => router.push(base));
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {defaultValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={isPending} size="sm" className="h-10">
        {isPending ? "Buscando..." : "Buscar"}
      </Button>
    </form>
  );
}
