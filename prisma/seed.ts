import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, StoreKind } from "@prisma/client";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱  Iniciando seed...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "brand-demo" },
    update: {},
    create: {
      name: "Marca Demo",
      slug: "brand-demo",
    },
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
        isActive: true,
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
        isActive: true,
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
        isActive: true,
      },
    }),
  ]);

  console.log(`✓  Lojas: ${storeAdmin.name}, ${storeAldeia.name}, ${storeCentro.name}`);

  const usersData = [
    {
      name: "Admin da Marca",
      email: "admin@demo.com",
      role: UserRole.ADMIN_DA_MARCA,
      password: "admin123",
      stores: [storeAdmin.id, storeAldeia.id, storeCentro.id],
      defaultStore: storeAdmin.id,
    },
    {
      name: "Gerente Aldeota",
      email: "gerente@demo.com",
      role: UserRole.GERENTE_LOJA,
      password: "gerente123",
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
    },
    {
      name: "Camila Vendedora",
      email: "vendedor@demo.com",
      role: UserRole.VENDEDOR,
      password: "vendedor123",
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
    },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: userData.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: userData.name,
        email: userData.email,
        passwordHash: await hash(userData.password),
        role: userData.role,
        isActive: true,
      },
    });

    await prisma.userStore.deleteMany({ where: { userId: user.id } });

    await prisma.userStore.createMany({
      data: userData.stores.map((storeId) => ({
        userId: user.id,
        storeId,
        isDefault: storeId === userData.defaultStore,
      })),
    });

    console.log(`✓  Usuário: ${user.name} (${user.email}) / senha: ${userData.password}`);
  }

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
