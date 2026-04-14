import type { ComissaoTipo, Prisma } from "@prisma/client";
import { ComissaoTipo as ComissaoTipoEnum } from "@prisma/client";
import { endOfDay, parseISO, startOfDay, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";

export type LancamentoComissaoListRow = {
  id: string;
  createdAt: Date;
  tipo: ComissaoTipo;
  baseCalculo: { toString(): string };
  percentual: number;
  valor: { toString(): string };
  pedidoNumero: number;
  storeName: string;
  beneficiarioNome: string;
};

export async function listLancamentosComissao(
  tenantId: string,
  input: {
    de?: string | null;
    ate?: string | null;
    colaboradorId?: string | null;
    corretorId?: string | null;
  },
): Promise<LancamentoComissaoListRow[]> {
  const now = new Date();
  const de = input.de
    ? startOfDay(parseISO(input.de))
    : startOfDay(subMonths(now, 1));
  const ate = input.ate ? endOfDay(parseISO(input.ate)) : endOfDay(now);

  const filtrosBeneficiario: Prisma.LancamentoComissaoWhereInput[] = [];
  if (input.colaboradorId) {
    filtrosBeneficiario.push({
      tipo: ComissaoTipoEnum.VENDEDOR,
      colaboradorId: input.colaboradorId,
    });
  }
  if (input.corretorId) {
    filtrosBeneficiario.push({
      tipo: ComissaoTipoEnum.CORRETOR,
      corretorId: input.corretorId,
    });
  }

  const where: Prisma.LancamentoComissaoWhereInput = {
    tenantId,
    createdAt: { gte: de, lte: ate },
    ...(filtrosBeneficiario.length === 0
      ? {}
      : filtrosBeneficiario.length === 1
        ? filtrosBeneficiario[0]
        : { OR: filtrosBeneficiario }),
  };

  const rows = await prisma.lancamentoComissao.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      pedido: { select: { numero: true } },
      store: { select: { name: true } },
      colaborador: { select: { name: true } },
      corretor: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    tipo: r.tipo,
    baseCalculo: r.baseCalculo,
    percentual: r.percentual,
    valor: r.valor,
    pedidoNumero: r.pedido.numero,
    storeName: r.store.name,
    beneficiarioNome:
      r.tipo === ComissaoTipoEnum.VENDEDOR
        ? r.colaborador?.name ?? "—"
        : r.corretor?.name ?? "—",
  }));
}
