import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmActionButton } from "@/modules/admin/components/confirm-action-button";
import { addOpcaoTamanhoRapidoForm, deleteOpcaoTamanho } from "@/modules/catalogo/actions/grade-tamanho-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Opcao = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  isActive: boolean;
};

type Props = {
  gradeTamanhoId: string;
  opcoes: Opcao[];
  /** Quando dentro do cartão da página de edição (sem borda extra). */
  embedded?: boolean;
};

export function GradeOpcoesPanel({ gradeTamanhoId, opcoes, embedded }: Props) {
  const shell = embedded
    ? "space-y-5 px-6 pb-5 pt-4"
    : "space-y-6 rounded-lg border bg-card p-6";

  return (
    <div className={shell}>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamanhos</p>
        <h3 className="text-sm font-medium text-foreground">Variações nesta grade</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cada linha é um tamanho que pode ser escolhido no produto — letras (<em>P</em>, <em>GG</em>) ou medidas (
          <em>36</em>, <em>38</em>). A ordem segue a lista (de cima para baixo).
        </p>
      </div>

      <form action={addOpcaoTamanhoRapidoForm} className="space-y-2">
        <input type="hidden" name="gradeTamanhoId" value={gradeTamanhoId} />
        <Label htmlFor="nova-opcao-nome">Adicionar tamanho</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            id="nova-opcao-nome"
            name="nome"
            placeholder="Ex.: P, PP, M ou 36, 38…"
            required
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            className={cn(
              buttonVariants(),
              "h-10 shrink-0 px-5 sm:min-w-[7.5rem]",
            )}
          >
            Adicionar
          </button>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Um tamanho por vez — letras ou números, como no resto do catálogo.
        </p>
      </form>

      {opcoes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/80 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
          Nenhum tamanho ainda. Use o campo acima para incluir P, M, 38…
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tamanho</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {opcoes.map((o) => (
                <tr key={o.id} className="bg-card transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{o.nome}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={o.isActive ? "secondary" : "outline"}>
                      {o.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmActionButton
                      title="Excluir este tamanho?"
                      description="Só é permitido se nenhum produto usar esta combinação."
                      actionLabel="Excluir"
                      triggerLabel="Excluir"
                      triggerClassName="text-destructive"
                      formAction={deleteOpcaoTamanho}
                      hiddenFields={{ id: o.id, gradeTamanhoId }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
