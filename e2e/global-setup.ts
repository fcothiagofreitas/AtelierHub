import { loadEnvConfig } from "@next/env";
import {
  FormaPagamento,
  PedidoEstado,
  Prisma,
  PrismaClient,
} from "@prisma/client";

loadEnvConfig(process.cwd());

/**
 * Garante que o pedido #3 (seed, Loja Aldeota) tenha pelo menos um pagamento,
 * para o link do recibo existir na UI. Idempotente.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[e2e/global-setup] DATABASE_URL ausente — não foi possível garantir pagamento de teste.",
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "brand-demo" },
      select: { id: true },
    });
    if (!tenant) {
      console.warn(
        "[e2e/global-setup] Tenant brand-demo não encontrado — corra `npx prisma db seed`.",
      );
      return;
    }

    const store = await prisma.store.findFirst({
      where: { tenantId: tenant.id, slug: "loja-aldeota" },
      select: { id: true },
    });
    if (!store) return;

    const pedido = await prisma.pedido.findFirst({
      where: {
        tenantId: tenant.id,
        storeId: store.id,
        numero: 3,
        estado: PedidoEstado.QUITADO,
      },
      select: { id: true, tenantId: true, total: true },
    });
    if (!pedido) {
      console.warn(
        "[e2e/global-setup] Pedido #3 quitado não encontrado — corra `npx prisma db seed`.",
      );
      return;
    }

    const existentes = await prisma.pagamento.count({
      where: { pedidoId: pedido.id },
    });
    if (existentes > 0) return;

    const valor = pedido.total ?? new Prisma.Decimal("89.90");
    await prisma.pagamento.create({
      data: {
        tenantId: pedido.tenantId,
        pedidoId: pedido.id,
        forma: FormaPagamento.PIX,
        valor,
      },
    });
    console.log("[e2e/global-setup] Pagamento PIX de teste criado para o pedido nº 3.");
  } finally {
    await prisma.$disconnect();
  }
}
