import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  UserRole,
  StoreKind,
  CorretorPaymentMethod,
  ClienteTipo,
} from "@prisma/client";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱  Iniciando seed...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "brand-demo" },
    update: {},
    create: { name: "Marca Demo", slug: "brand-demo" },
  });

  console.log(`✓  Tenant: ${tenant.name}`);

  const [storeAdmin, storeAldeia, storeCentro] = await Promise.all([
    prisma.store.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "administrativo" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Administrativo",
        slug: "administrativo",
        kind: StoreKind.ADMINISTRATIVE,
      },
    }),
    prisma.store.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "loja-aldeota" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Loja Aldeota",
        slug: "loja-aldeota",
        kind: StoreKind.OPERATIONAL,
      },
    }),
    prisma.store.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: "loja-centro" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Loja Centro",
        slug: "loja-centro",
        kind: StoreKind.OPERATIONAL,
      },
    }),
  ]);

  console.log(`✓  Lojas: ${storeAdmin.name}, ${storeAldeia.name}, ${storeCentro.name}`);

  await prisma.corretor.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.corretor.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Corretor Ilimitado (seed)",
        email: "corretor.ilimitado@demo.com",
        commissionPercent: 5,
        paymentMethod: CorretorPaymentMethod.PIX,
        pixKey: "corretor.ilimitado@demo.com",
        creditLimitConsignado: null,
        isActive: true,
        isBlocked: false,
      },
      {
        tenantId: tenant.id,
        name: "Corretor Com Teto (seed)",
        email: "corretor.teto@demo.com",
        commissionPercent: 4.5,
        paymentMethod: CorretorPaymentMethod.BANK_TRANSFER,
        bankName: "Banco Demo",
        bankBranch: "0001",
        bankAccount: "12345-6",
        creditLimitConsignado: new Prisma.Decimal(50000),
        isActive: true,
        isBlocked: false,
      },
    ],
  });
  console.log("✓  Corretores de exemplo (ilimitado + teto R$ 50.000)");

  // Dados de cada colaborador: pessoa primeiro, login opcional
  const colaboradoresData = [
    {
      name: "Admin da Marca",
      role: UserRole.ADMIN_DA_MARCA,
      stores: [storeAdmin.id, storeAldeia.id, storeCentro.id],
      defaultStore: storeAdmin.id,
      login: { email: "admin@demo.com", password: "admin123" },
    },
    {
      name: "Gerente Aldeota",
      role: UserRole.GERENTE_LOJA,
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
      login: { email: "gerente@demo.com", password: "gerente123" },
    },
    {
      name: "Camila Vendedora",
      role: UserRole.VENDEDOR,
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
      minCommission: 1.5,
      login: { email: "vendedor@demo.com", password: "vendedor123" },
    },
  ];

  for (const data of colaboradoresData) {
    // Cria ou atualiza o User (login)
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: data.login.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: data.login.email,
        passwordHash: await hash(data.login.password),
        isActive: true,
      },
    });

    // Cria ou atualiza o Colaborador vinculado ao User
    const colaborador = await prisma.colaborador.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        tenantId: tenant.id,
        name: data.name,
        role: data.role,
        isActive: true,
        minCommission: data.minCommission ?? 0,
        userId: user.id,
      },
    });

    // Recria os vínculos de loja
    await prisma.colaboradorStore.deleteMany({ where: { colaboradorId: colaborador.id } });
    await prisma.colaboradorStore.createMany({
      data: data.stores.map((storeId) => ({
        colaboradorId: colaborador.id,
        storeId,
        isDefault: storeId === data.defaultStore,
      })),
    });

    console.log(
      `✓  Colaborador: ${colaborador.name} (${data.login.email}) / senha: ${data.login.password}`,
    );
  }

  await prisma.cliente.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.$transaction([
    prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        tipo: ClienteTipo.PF,
        nome: "Helena Cliente (seed)",
        cpf: "12345678909",
        endereco: "Rua Seed, 100 — Aldeota",
        telefone: "85999990001",
        email: "helena@seed.demo",
        isActive: true,
        isBlocked: false,
      },
    }),
    prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        tipo: ClienteTipo.PJ,
        fantasia: "Moda Seed",
        razaoSocial: "Moda Seed Indústria e Comércio LTDA",
        cnpj: "11222333000181",
        ieIsento: true,
        endereco: "Av. Seed, 500",
        telefone: "8530010000",
        email: "contato@modaseed.demo",
        responsavelNome: "Carlos Responsável",
        responsavelFone: "85988776655",
        isActive: true,
        isBlocked: false,
      },
    }),
  ]);
  console.log("✓  Clientes de exemplo (PF + PJ na Loja Aldeota)");

  console.log("\n✅  Seed concluído com sucesso!");
  console.log("\n📌  Credenciais de teste:");
  console.log("   admin@demo.com    / admin123    → Admin da marca (todas as lojas)");
  console.log("   gerente@demo.com  / gerente123  → Gerente (Loja Aldeota)");
  console.log("   vendedor@demo.com / vendedor123 → Vendedor (Loja Aldeota)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
