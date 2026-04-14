import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getBalancoEstoqueDetalhe } from "@/modules/estoque/balanco-estoque-queries";
import { BalancoEstoqueDetailPanel } from "@/modules/estoque/components/balanco-estoque-detail-panel";
import { ESTOQUE_ROLES_ESCRITA } from "@/modules/estoque/estoque-roles";

const estadoLabel: Record<string, string> = {
  RASCUNHO: "Rascunho",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type Props = { params: Promise<{ id: string }> };

export default async function BalancoEstoqueDetalhePage({ params }: Props) {
  const { id } = await params;
  const result = await getBalancoEstoqueDetalhe(id);
  if ("error" in result) {
    if (result.error === "Não encontrado.") {
      notFound();
    }
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12">
        <p className="text-sm text-destructive">{result.error}</p>
        <Link
          href="/admin/estoque/balanco"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Voltar à lista
        </Link>
      </div>
    );
  }

  const { session, balanco } = result;
  const podeEditar = ESTOQUE_ROLES_ESCRITA.includes(session.user.role);

  const itens = balanco.itens.map((it) => ({
    id: it.id,
    saldoSnapshot: it.saldoSnapshot,
    quantidadeContada: it.quantidadeContada,
    saldoNoFecho: it.saldoNoFecho,
    deltaAplicado: it.deltaAplicado,
    produtoVariacao: {
      nome: it.produtoVariacao.nome,
      ean13: it.produtoVariacao.ean13,
      produto: it.produtoVariacao.produto,
      opcaoTamanho: it.produtoVariacao.opcaoTamanho,
      corCatalogo: it.produtoVariacao.corCatalogo,
    },
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/estoque/balanco"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Balanço de estoque
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Balanço #{balanco.numero}
          </h1>
          <Badge variant={balanco.estado === "CONCLUIDO" ? "default" : "secondary"}>
            {estadoLabel[balanco.estado] ?? balanco.estado}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Loja: <span className="text-foreground">{balanco.store.name}</span>
          {balanco.criadoPor && (
            <>
              {" "}
              · Criado por {balanco.criadoPor.name}
            </>
          )}
          {balanco.observacoes && (
            <>
              <br />
              <span className="text-foreground">{balanco.observacoes}</span>
            </>
          )}
        </p>
      </div>

      <BalancoEstoqueDetailPanel
        balancoId={balanco.id}
        numero={balanco.numero}
        estado={balanco.estado}
        podeEditar={podeEditar}
        itens={itens}
      />
    </div>
  );
}
