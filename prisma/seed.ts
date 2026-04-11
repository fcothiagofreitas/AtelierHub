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

  const store = await prisma.store.upsert({
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

  const user = await prisma.user.upsert({
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

  await prisma.userStore.upsert({
    where: {
      userId_storeId: {
        userId: user.id,
        storeId: store.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: user.id,
      storeId: store.id,
      isDefault: true,
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Usuário inicial: ${adminEmail}`);
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
