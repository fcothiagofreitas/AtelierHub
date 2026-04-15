"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createGradeComOpcoes,
  type GradeTamanhoActionResult,
} from "@/modules/catalogo/actions/grade-tamanho-actions";

const OPCOES_PLACEHOLDER = `P
PP
M
GG

ou

36, 38, 40, 42`;

export function GradeTamanhoNovoForm() {
  const [state, action, isPending] = useActionState(
    createGradeComOpcoes,
    null as GradeTamanhoActionResult | null,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/catalogo/tamanhos"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Voltar para grades
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Nova grade de tamanhos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A <span className="font-medium text-foreground">grade</span> é o conjunto (letras, números,
          etc.). As <span className="font-medium text-foreground">variações</span> são cada tamanho
          que entra nos produtos.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <form action={action} className="space-y-8">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome-grade">Nome da grade</Label>
              <Input
                id="nome-grade"
                name="nome"
                required
                placeholder="Ex.: Letras · Numérico adulto · Infantil"
                autoComplete="off"
                aria-invalid={Boolean(state?.fieldErrors?.nome)}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Identifica o <strong>tipo</strong> deste conjunto (não é o tamanho em si). Use nomes
                como <em>Letras</em>, <em>Numérico</em> ou <em>Infantil</em> para organizar grades
                diferentes na marca.
              </p>
              {state?.fieldErrors?.nome && (
                <p className="text-xs text-destructive">{state.fieldErrors.nome}</p>
              )}
            </div>

            <input type="hidden" name="ordem" value="0" />

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked
                  className="rounded border-input"
                />
                Grade ativa
              </label>
            </div>
          </div>

          <div className="space-y-2 border-t pt-6">
            <Label htmlFor="opcoes-text">Variações de tamanho</Label>
            <textarea
              id="opcoes-text"
              name="opcoesText"
              rows={10}
              required
              placeholder={OPCOES_PLACEHOLDER}
              className={cn(
                "flex min-h-[180px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono",
                "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                state?.fieldErrors?.opcoesText && "border-destructive",
              )}
              aria-invalid={Boolean(state?.fieldErrors?.opcoesText)}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Informe <strong>uma opção por linha</strong>, ou <strong>separadas por vírgula</strong>{" "}
              / ponto-e-vírgula. Exemplos: <em>P, PP, M, GG, XG</em> ou <em>36, 38, 40, 42</em>. Cada
              valor vira uma opção usada ao montar o produto (tamanho × cor).
            </p>
            {state?.fieldErrors?.opcoesText && (
              <p className="text-xs text-destructive">{state.fieldErrors.opcoesText}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-6">
            <Link href="/admin/catalogo/tamanhos" className={cn(buttonVariants({ variant: "outline" }))}>
              Cancelar
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Criar grade e variações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
