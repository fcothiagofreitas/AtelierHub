"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
type TaxonomySaveResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

type Defaults = {
  id?: string;
  nome: string;
  slug: string;
  ordem: number;
  isActive: boolean;
};

type SimpleTaxonomyFormProps = {
  /** Em `variant="embedded"` pode omitir (cabeçalho fica na página). */
  title?: string;
  description?: string;
  backHref: string;
  listLabel: string;
  saveAction: (
    prev: TaxonomySaveResult | null,
    formData: FormData,
  ) => Promise<TaxonomySaveResult>;
  defaults?: Defaults | null;
  extraFields?: React.ReactNode;
  /** Sobrescreve o rótulo padrão "Nome". */
  nomeLabel?: string;
  nomePlaceholder?: string;
  nomeHint?: React.ReactNode;
  /** `embedded`: só o formulário, sem voltar/título/cartão — use dentro de um cartão na página. */
  variant?: "full" | "embedded";
  showSlug?: boolean;
  showOrdem?: boolean;
  /** Só em `variant="embedded"`. Se false, não renderiza Cancelar/Salvar no fim do &lt;form&gt;; use `children` + rodapé depois (ex.: tamanhos antes dos botões). */
  showFooterActions?: boolean;
  /** Conteúdo entre o form de identificação e o rodapé (quando `showFooterActions` é false). */
  children?: React.ReactNode;
  /** Atributo `id` do &lt;form&gt; quando o rodapé fica fora (para `button form="…"`). */
  formId?: string;
};

export function SimpleTaxonomyForm({
  title = "",
  description = "",
  backHref,
  listLabel,
  saveAction,
  defaults,
  extraFields,
  nomeLabel = "Nome",
  nomePlaceholder,
  nomeHint,
  variant = "full",
  showSlug = true,
  showOrdem = true,
  showFooterActions = true,
  children,
  formId: formIdProp,
}: SimpleTaxonomyFormProps) {
  const [state, action, isPending] = useActionState(saveAction, null);
  const reactId = useId().replace(/:/g, "");
  const formId = formIdProp ?? `taxonomy-form-${reactId}`;

  const embedded = variant === "embedded";
  const footerOutside = embedded && !showFooterActions;

  const formFieldsClass = embedded
    ? cn("space-y-4", footerOutside ? "px-6 pb-5 pt-3" : "px-6 pb-6 pt-1")
    : "space-y-5";

  const formBody = (
    <>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      {!showSlug && <input type="hidden" name="slug" value="" />}
      {!showOrdem && (
        <input type="hidden" name="ordem" value={String(defaults?.ordem ?? 0)} />
      )}

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {extraFields}

      <div className="space-y-1.5">
        <Label htmlFor="nome">{nomeLabel}</Label>
        <Input
          id="nome"
          name="nome"
          required
          placeholder={nomePlaceholder}
          defaultValue={defaults?.nome ?? ""}
          aria-invalid={Boolean(state?.fieldErrors?.nome)}
        />
        {nomeHint && (
          <p className="text-xs text-muted-foreground leading-relaxed">{nomeHint}</p>
        )}
        {state?.fieldErrors?.nome && (
          <p className="text-xs text-destructive">{state.fieldErrors.nome}</p>
        )}
      </div>

      {showSlug && (
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (opcional)</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="Gerado automaticamente a partir do nome se vazio"
            defaultValue={defaults?.slug ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            URL amigável; letras minúsculas, números e hífens.
          </p>
        </div>
      )}

      {showOrdem ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ordem">Ordem</Label>
            <Input
              id="ordem"
              name="ordem"
              type="number"
              min={0}
              defaultValue={defaults?.ordem ?? 0}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={defaults?.isActive ?? true}
                className="rounded border-input"
              />
              Ativo
            </label>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults?.isActive ?? true}
              className="rounded border-input"
            />
            Grade ativa
          </label>
        </div>
      )}
    </>
  );

  const footerBar = (
    <div
      className={cn(
        "flex justify-end gap-2",
        footerOutside
          ? "border-t border-border/60 bg-muted/10 px-6 py-3"
          : embedded
            ? "border-t border-border/60 pt-4"
            : "pt-2",
      )}
    >
      <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }))}>
        Cancelar
      </Link>
      <Button
        type="submit"
        form={footerOutside ? formId : undefined}
        disabled={isPending}
      >
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );

  const formInner = (
    <form
      id={footerOutside ? formId : undefined}
      action={action}
      className={formFieldsClass}
    >
      {formBody}
      {!footerOutside && showFooterActions && footerBar}
    </form>
  );

  if (embedded && footerOutside) {
    return (
      <>
        {formInner}
        {children}
        {footerBar}
      </>
    );
  }

  if (embedded) {
    return formInner;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {listLabel}
        </Link>
        <h2 className="mt-3 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-lg border bg-card p-6">{formInner}</div>
    </div>
  );
}
