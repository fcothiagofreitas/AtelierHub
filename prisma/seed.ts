import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "",
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantName = process.env.SEED_TENANT_NAME ?? "AtelierHub Demo";
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "atelierhub-demo";
  const adminStoreName = process.env.SEED_ADMIN_STORE_NAME ?? "Administrativo";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@atelierhub.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "12345678";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: {
      name: tenantName,
      slug: tenantSlug,
    },
  });

  const adminStore = await prisma.store.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "administrativo",
      },
    },
    update: {
      name: adminStoreName,
      kind: "ADMINISTRATIVE",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: adminStoreName,
      slug: "administrativo",
      kind: "ADMINISTRATIVE",
    },
  });

  const centroStore = await prisma.store.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "loja-centro",
      },
    },
    update: {
      name: "Loja Centro",
      kind: "OPERATIONAL",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: "Loja Centro",
      slug: "loja-centro",
      kind: "OPERATIONAL",
    },
  });

  const aldeotaStore = await prisma.store.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "loja-aldeota",
      },
    },
    update: {
      name: "Loja Aldeota",
      kind: "OPERATIONAL",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: "Loja Aldeota",
      slug: "loja-aldeota",
      kind: "OPERATIONAL",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: adminEmail,
      },
    },
    update: {
      name: "Administrador inicial",
      role: "ADMIN_DA_MARCA",
      isActive: true,
      passwordHash,
    },
    create: {
      tenantId: tenant.id,
      name: "Administrador inicial",
      email: adminEmail,
      passwordHash,
      role: "ADMIN_DA_MARCA",
    },
  });

  const administrativoUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "administrativo@atelierhub.local",
      },
    },
    update: {
      name: "Operacao Administrativa",
      role: "ADMINISTRATIVO",
      isActive: true,
      passwordHash,
    },
    create: {
      tenantId: tenant.id,
      name: "Operacao Administrativa",
      email: "administrativo@atelierhub.local",
      passwordHash,
      role: "ADMINISTRATIVO",
    },
  });

  const gerenteUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "gerente@atelierhub.local",
      },
    },
    update: {
      name: "Gerente Loja Centro",
      role: "GERENTE_LOJA",
      isActive: true,
      passwordHash,
    },
    create: {
      tenantId: tenant.id,
      name: "Gerente Loja Centro",
      email: "gerente@atelierhub.local",
      passwordHash,
      role: "GERENTE_LOJA",
    },
  });

  const vendedorUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "vendedor@atelierhub.local",
      },
    },
    update: {
      name: "Vendedor Multi Loja",
      role: "VENDEDOR",
      isActive: true,
      passwordHash,
    },
    create: {
      tenantId: tenant.id,
      name: "Vendedor Multi Loja",
      email: "vendedor@atelierhub.local",
      passwordHash,
      role: "VENDEDOR",
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: adminUser.id,
        storeId: adminStore.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: adminUser.id,
      storeId: adminStore.id,
      isDefault: true,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: adminUser.id,
        storeId: centroStore.id,
      },
    },
    update: {
      isDefault: false,
    },
    create: {
      userId: adminUser.id,
      storeId: centroStore.id,
      isDefault: false,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: adminUser.id,
        storeId: aldeotaStore.id,
      },
    },
    update: {
      isDefault: false,
    },
    create: {
      userId: adminUser.id,
      storeId: aldeotaStore.id,
      isDefault: false,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: administrativoUser.id,
        storeId: adminStore.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: administrativoUser.id,
      storeId: adminStore.id,
      isDefault: true,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: administrativoUser.id,
        storeId: centroStore.id,
      },
    },
    update: {
      isDefault: false,
    },
    create: {
      userId: administrativoUser.id,
      storeId: centroStore.id,
      isDefault: false,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: administrativoUser.id,
        storeId: aldeotaStore.id,
      },
    },
    update: {
      isDefault: false,
    },
    create: {
      userId: administrativoUser.id,
      storeId: aldeotaStore.id,
      isDefault: false,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: gerenteUser.id,
        storeId: centroStore.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: gerenteUser.id,
      storeId: centroStore.id,
      isDefault: true,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: vendedorUser.id,
        storeId: centroStore.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: vendedorUser.id,
      storeId: centroStore.id,
      isDefault: true,
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: vendedorUser.id,
        storeId: aldeotaStore.id,
      },
    },
    update: {
      isDefault: false,
    },
    create: {
      userId: vendedorUser.id,
      storeId: aldeotaStore.id,
      isDefault: false,
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Admin da marca: ${adminEmail}`);
  console.log("Administrativo: administrativo@atelierhub.local");
  console.log("Gerente de loja: gerente@atelierhub.local");
  console.log("Vendedor multi-loja: vendedor@atelierhub.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
