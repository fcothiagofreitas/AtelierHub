import type {
  FormaPagamento,
  GrupoCobrancaTipo,
  PedidoEstado,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clienteNomeCurto } from "@/modules/vendas/lib/cliente-nome";

const ESTADOS_ABERTO: PedidoEstado[] = ["EM_ABERTO", "PAGO_PARCIAL"];

function saldoFromPedido(
  total: Prisma.Decimal | null,
  pagamentos: { valor: Prisma.Decimal }[],
): Prisma.Decimal {
  if (!total) return new Prisma.Decimal(0);
  const pago = pagamentos.reduce(
    (acc, p) => acc.add(p.valor),
    new Prisma.Decimal(0),
  );
  const s = total.sub(pago);
  return s.gt(0) ? s : new Prisma.Decimal(0);
}

export type ContaReceberClienteRow = {
  clienteId: string;
  label: string;
  pedidosEmAberto: number;
  saldoTotal: number;
};

export type ContaReceberCorretorRow = {
  corretorId: string;
  name: string;
  pedidosEmAberto: number;
  saldoTotal: number;
};

/** Agrega saldo em aberto por cliente (pedidos com cliente). */
export async function listContasReceberPorCliente(
  tenantId: string,
  storeId: string,
): Promise<ContaReceberClienteRow[]> {
  const pedidos = await prisma.pedido.findMany({
    where: {
      tenantId,
      storeId,
      estado: { in: ESTADOS_ABERTO },
      clienteId: { not: null },
      total: { not: null },
    },
    include: {
      pagamentos: { select: { valor: true } },
      cliente: {
        select: {
          id: true,
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  const map = new Map<
    string,
    { label: string; pedidos: number; saldo: Prisma.Decimal }
  >();

  for (const p of pedidos) {
    if (!p.clienteId || !p.cliente) continue;
    const saldo = saldoFromPedido(p.total, p.pagamentos);
    if (saldo.lte(0)) continue;
    const cur = map.get(p.clienteId);
    const label = clienteNomeCurto(p.cliente);
    if (cur) {
      cur.pedidos += 1;
      cur.saldo = cur.saldo.add(saldo);
    } else {
      map.set(p.clienteId, {
        label,
        pedidos: 1,
        saldo,
      });
    }
  }

  return [...map.entries()]
    .map(([clienteId, v]) => ({
      clienteId,
      label: v.label,
      pedidosEmAberto: v.pedidos,
      saldoTotal: Number(v.saldo.toFixed(2)),
    }))
    .sort((a, b) => b.saldoTotal - a.saldoTotal);
}

/** Agrega saldo em aberto por corretor (pedidos com corretor). */
export async function listContasReceberPorCorretor(
  tenantId: string,
  storeId: string,
): Promise<ContaReceberCorretorRow[]> {
  const pedidos = await prisma.pedido.findMany({
    where: {
      tenantId,
      storeId,
      estado: { in: ESTADOS_ABERTO },
      corretorId: { not: null },
      total: { not: null },
    },
    include: {
      pagamentos: { select: { valor: true } },
      corretor: { select: { id: true, name: true } },
    },
  });

  const map = new Map<
    string,
    { name: string; pedidos: number; saldo: Prisma.Decimal }
  >();

  for (const p of pedidos) {
    if (!p.corretorId || !p.corretor) continue;
    const saldo = saldoFromPedido(p.total, p.pagamentos);
    if (saldo.lte(0)) continue;
    const cur = map.get(p.corretorId);
    if (cur) {
      cur.pedidos += 1;
      cur.saldo = cur.saldo.add(saldo);
    } else {
      map.set(p.corretorId, {
        name: p.corretor.name,
        pedidos: 1,
        saldo,
      });
    }
  }

  return [...map.entries()]
    .map(([corretorId, v]) => ({
      corretorId,
      name: v.name,
      pedidosEmAberto: v.pedidos,
      saldoTotal: Number(v.saldo.toFixed(2)),
    }))
    .sort((a, b) => b.saldoTotal - a.saldoTotal);
}

/** Pagamentos já registados no pedido (para resumo na tela de recebimento). */
export type PagamentoAbertoGrupoLinha = {
  id: string;
  createdAt: string;
  forma: FormaPagamento;
  valor: number;
  obs: string | null;
};

export type PedidoAbertoGrupoRow = {
  id: string;
  numero: number;
  clienteLabel: string | null;
  saldo: number;
  total: number;
  jaPago: number;
  createdAt: string;
  pagamentos: PagamentoAbertoGrupoLinha[];
};

export async function listPedidosAbertosParaGrupo(
  tenantId: string,
  storeId: string,
  opts: { tipo: GrupoCobrancaTipo; clienteId?: string; corretorId?: string },
): Promise<PedidoAbertoGrupoRow[]> {
  const base: Prisma.PedidoWhereInput = {
    tenantId,
    storeId,
    estado: { in: ESTADOS_ABERTO },
    total: { not: null },
  };

  if (opts.tipo === "CLIENTE") {
    if (!opts.clienteId) return [];
    base.clienteId = opts.clienteId;
  } else {
    if (!opts.corretorId) return [];
    base.corretorId = opts.corretorId;
  }

  const rows = await prisma.pedido.findMany({
    where: base,
    include: {
      pagamentos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          forma: true,
          valor: true,
          obs: true,
        },
      },
      cliente: {
        select: {
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
    },
    orderBy: [{ numero: "asc" }],
    take: 500,
  });

  const out: PedidoAbertoGrupoRow[] = [];
  for (const p of rows) {
    const jaPago = p.pagamentos.reduce(
      (acc, x) => acc.add(x.valor),
      new Prisma.Decimal(0),
    );
    const total = p.total!;
    const saldo = saldoFromPedido(total, p.pagamentos);
    if (saldo.lte(0)) continue;
    out.push({
      id: p.id,
      numero: p.numero,
      clienteLabel: p.cliente ? clienteNomeCurto(p.cliente) : null,
      saldo: Number(saldo.toFixed(2)),
      total: Number(total.toFixed(2)),
      jaPago: Number(jaPago.toFixed(2)),
      createdAt: p.createdAt.toISOString(),
      pagamentos: p.pagamentos.map((x) => ({
        id: x.id,
        createdAt: x.createdAt.toISOString(),
        forma: x.forma,
        valor: Number(x.valor.toFixed(2)),
        obs: x.obs,
      })),
    });
  }
  return out;
}

export type GrupoCobrancaDetalhe = {
  id: string;
  tipo: GrupoCobrancaTipo;
  storeId: string;
  /** Em RSC pode ser serializado como string ao passar para client components. */
  createdAt: Date | string;
  cliente: { id: string; label: string } | null;
  corretor: { id: string; name: string } | null;
  itens: Array<{
    pedidoId: string;
    numero: number;
    saldo: number;
    total: number;
    jaPago: number;
  }>;
  saldoGrupo: number;
};

export async function getGrupoCobrancaDetalhe(
  tenantId: string,
  storeId: string,
  grupoId: string,
): Promise<GrupoCobrancaDetalhe | null> {
  const grupo = await prisma.grupoCobranca.findFirst({
    where: { id: grupoId, tenantId, storeId },
    include: {
      cliente: {
        select: {
          id: true,
          tipo: true,
          nome: true,
          fantasia: true,
          razaoSocial: true,
        },
      },
      corretor: { select: { id: true, name: true } },
      itens: {
        orderBy: [{ ordem: "asc" }, { id: "asc" }],
        include: {
          pedido: {
            include: { pagamentos: { select: { valor: true } } },
          },
        },
      },
    },
  });

  if (!grupo) return null;

  let saldoGrupo = new Prisma.Decimal(0);
  const itens: GrupoCobrancaDetalhe["itens"] = [];

  for (const it of grupo.itens) {
    const ped = it.pedido;
    const jaPago = ped.pagamentos.reduce(
      (acc, x) => acc.add(x.valor),
      new Prisma.Decimal(0),
    );
    const total = ped.total;
    const saldo = saldoFromPedido(total, ped.pagamentos);
    saldoGrupo = saldoGrupo.add(saldo);
    itens.push({
      pedidoId: ped.id,
      numero: ped.numero,
      saldo: Number(saldo.toFixed(2)),
      total: total != null ? Number(total.toFixed(2)) : 0,
      jaPago: Number(jaPago.toFixed(2)),
    });
  }

  return {
    id: grupo.id,
    tipo: grupo.tipo,
    storeId: grupo.storeId,
    createdAt: grupo.createdAt,
    cliente: grupo.cliente
      ? {
          id: grupo.cliente.id,
          label: clienteNomeCurto(grupo.cliente),
        }
      : null,
    corretor: grupo.corretor
      ? { id: grupo.corretor.id, name: grupo.corretor.name }
      : null,
    itens,
    saldoGrupo: Number(saldoGrupo.toFixed(2)),
  };
}

/** Rótulo para o cabeçalho da página de recebimento (cliente ou corretor). */
export async function getRecebimentoPartyLabel(
  tenantId: string,
  storeId: string,
  tipo: GrupoCobrancaTipo,
  clienteId?: string,
  corretorId?: string,
): Promise<string | null> {
  if (tipo === "CLIENTE" && clienteId) {
    const c = await prisma.cliente.findFirst({
      where: { id: clienteId, tenantId, storeId },
      select: {
        tipo: true,
        nome: true,
        fantasia: true,
        razaoSocial: true,
      },
    });
    return c ? clienteNomeCurto(c) : null;
  }
  if (tipo === "CORRETOR" && corretorId) {
    const c = await prisma.corretor.findFirst({
      where: { id: corretorId, tenantId },
      select: { name: true },
    });
    return c?.name ?? null;
  }
  return null;
}
