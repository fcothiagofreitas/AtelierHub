import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { upsertGradeTamanho } from "@/modules/catalogo/actions/grade-tamanho-actions";
import { CatalogoListAlert } from "@/modules/catalogo/components/catalogo-list-alert";
import { GradeOpcoesPanel } from "@/modules/catalogo/components/grade-opcoes-panel";
import { SimpleTaxonomyForm } from "@/modules/catalogo/components/simple-taxonomy-form";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function EditarGradeTamanhoPage({ params, searchParams }: Props) {
  const session = await requireRole(["ADMIN_DA_MARCA", "ADMINISTRATIVO"]);
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const err = sp.e;

  const row = await prisma.gradeTamanho.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      opcoes: { orderBy: [{ ordem: "asc" }, { nome: "asc" }] },
    },
  });
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/catalogo/tamanhos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4 shrink-0" />
          Voltar para grades
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Editar grade</h1>
        <p className="text-base font-medium text-foreground">{row.nome}</p>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          O nome acima identifica o <strong className="font-medium text-foreground">conjunto</strong> (ex.: Letras,
          Numérico). Os tamanhos que o cliente escolhe — P, M, 38… — ficam na lista abaixo.
        </p>
      </header>

      <CatalogoListAlert code={err} />

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificação</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
            Nome do conjunto para a equipa. Slug e ordem na lista são automáticos.
          </p>
        </div>

        <SimpleTaxonomyForm
          variant="embedded"
          backHref="/admin/catalogo/tamanhos"
          listLabel="Voltar para grades"
          saveAction={upsertGradeTamanho}
          showSlug={false}
          showOrdem={false}
          showFooterActions={false}
          nomeLabel="Nome da grade"
          nomePlaceholder="Ex.: Letras · Numérico · Infantil"
          nomeHint={
            <>
              Use um <strong className="font-medium text-foreground">rótulo do conjunto</strong>, não a lista de
              medidas. Ex.: <em>Numérico</em>, <em>Letras</em> — os valores 36, 38… cadastram-se em{" "}
              <span className="font-medium text-foreground">Tamanhos</span>.
            </>
          }
          defaults={{
            id: row.id,
            nome: row.nome,
            slug: row.slug,
            ordem: row.ordem,
            isActive: row.isActive,
          }}
        >
          <div className="border-t border-border/60">
            <GradeOpcoesPanel gradeTamanhoId={row.id} opcoes={row.opcoes} embedded />
          </div>
        </SimpleTaxonomyForm>
      </div>
    </div>
  );
}
