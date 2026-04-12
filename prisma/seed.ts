import bcrypt from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  UserRole,
  StoreKind,
  CorretorPaymentMethod,
  ClienteTipo,
  PedidoEstado,
  PedidoModalidade,
} from "@prisma/client";
import { buildEan13FromBody12 } from "../src/lib/ean13";
import { formatNomeGrade } from "../src/lib/produto-grade";
import { entradaManualEstoque } from "../src/modules/estoque/estoque-service";

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

  await prisma.pedido.deleteMany({ where: { tenantId: tenant.id } });
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

  await prisma.produto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.catalogoCor.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.gradeTamanho.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.subcategoriaProduto.deleteMany({
    where: { categoria: { tenantId: tenant.id } },
  });
  await prisma.categoriaProduto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tipoProduto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.colecaoProduto.deleteMany({ where: { tenantId: tenant.id } });

  const eanDemo = buildEan13FromBody12(`789${String(1).padStart(9, "0")}`);

  const cat = await prisma.categoriaProduto.create({
    data: {
      tenantId: tenant.id,
      nome: "Vestuário",
      slug: "vestuario",
      ordem: 0,
      isActive: true,
    },
  });
  const sub = await prisma.subcategoriaProduto.create({
    data: {
      categoriaId: cat.id,
      nome: "Calças",
      slug: "calcas",
      ordem: 0,
      isActive: true,
    },
  });
  const tipo = await prisma.tipoProduto.create({
    data: {
      tenantId: tenant.id,
      nome: "Calça",
      slug: "calca",
      ordem: 0,
      isActive: true,
    },
  });
  const col = await prisma.colecaoProduto.create({
    data: {
      tenantId: tenant.id,
      nome: "Verão 2026",
      slug: "verao-2026",
      ordem: 0,
      isActive: true,
    },
  });

  const gradeLetras = await prisma.gradeTamanho.create({
    data: {
      tenantId: tenant.id,
      nome: "Letras",
      slug: "letras",
      ordem: 0,
      isActive: true,
    },
  });
  const opUnico = await prisma.opcaoTamanho.create({
    data: {
      gradeTamanhoId: gradeLetras.id,
      nome: "Único",
      slug: "unico",
      ordem: 0,
      isActive: true,
    },
  });
  const corAzul = await prisma.catalogoCor.create({
    data: {
      tenantId: tenant.id,
      nome: "Azul",
      slug: "azul",
      ordem: 0,
      isActive: true,
    },
  });

  const produtoSeed = await prisma.produto.create({
    data: {
      tenantId: tenant.id,
      referencia: "SEED-CALCA-001",
      nome: "Calça jeans (seed)",
      descricao: "Produto de exemplo com variação, NCM/CEST e EAN-13.",
      categoriaId: cat.id,
      subcategoriaId: sub.id,
      tipoId: tipo.id,
      colecaoId: col.id,
      gradeTamanhoId: gradeLetras.id,
      isActive: true,
      ncm: "61034900",
      cest: "2803800",
      origemMercadoria: 0,
      unidadeTributavel: "UN",
      variacoes: {
        create: [
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opUnico.id,
            corCatalogoId: corAzul.id,
            nome: formatNomeGrade(opUnico.nome, corAzul.nome),
            ean13: eanDemo,
            codigoExterno: "FORN-001",
            ordem: 0,
          },
        ],
      },
    },
    include: { variacoes: true },
  });

  const variacaoId = produtoSeed.variacoes[0]!.id;

  const vendedora = await prisma.colaborador.findFirst({
    where: { tenantId: tenant.id, user: { email: "vendedor@demo.com" } },
  });
  const corretorSeed = await prisma.corretor.findFirst({
    where: { tenantId: tenant.id, name: { contains: "Ilimitado" } },
  });
  const clientePf = await prisma.cliente.findFirst({
    where: { tenantId: tenant.id, storeId: storeAldeia.id, cpf: "12345678909" },
  });
  const clientePj = await prisma.cliente.findFirst({
    where: { tenantId: tenant.id, storeId: storeAldeia.id, cnpj: "11222333000181" },
  });

  if (vendedora && clientePf && corretorSeed) {
    await prisma.pedido.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        numero: 1,
        clienteId: clientePf.id,
        vendedorId: vendedora.id,
        corretorId: corretorSeed.id,
        estado: PedidoEstado.EM_ABERTO,
        modalidade: PedidoModalidade.DIRETA,
        total: new Prisma.Decimal("299.90"),
        itens: {
          create: [
            {
              produtoVariacaoId: variacaoId,
              quantidade: 1,
              precoUnitario: new Prisma.Decimal("299.90"),
            },
          ],
        },
      },
    });
    if (clientePj) {
      await prisma.pedido.create({
        data: {
          tenantId: tenant.id,
          storeId: storeAldeia.id,
          numero: 2,
          clienteId: clientePj.id,
          vendedorId: vendedora.id,
          corretorId: null,
          estado: PedidoEstado.EM_ANDAMENTO,
          modalidade: PedidoModalidade.CONSIGNADA,
          total: null,
          itens: {
            create: [
              {
                produtoVariacaoId: variacaoId,
                quantidade: 2,
                precoUnitario: new Prisma.Decimal("150.00"),
              },
            ],
          },
        },
      });
    }
    await prisma.pedido.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        numero: 3,
        clienteId: clientePf.id,
        vendedorId: vendedora.id,
        corretorId: null,
        estado: PedidoEstado.QUITADO,
        modalidade: PedidoModalidade.DIRETA,
        total: new Prisma.Decimal("89.90"),
        createdAt: new Date("2025-11-10T15:30:00.000Z"),
        itens: {
          create: [
            {
              produtoVariacaoId: variacaoId,
              quantidade: 1,
              precoUnitario: new Prisma.Decimal("89.90"),
            },
          ],
        },
      },
    });
    console.log("✓  Pedidos de exemplo (em aberto, em andamento, quitado)");
  }

  await entradaManualEstoque({
    tenantId: tenant.id,
    userId: null,
    storeId: storeAldeia.id,
    produtoVariacaoId: variacaoId,
    quantidade: 5,
  });
  await entradaManualEstoque({
    tenantId: tenant.id,
    userId: null,
    storeId: storeAdmin.id,
    produtoVariacaoId: variacaoId,
    quantidade: 12,
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { eanSequence: 1 },
  });
  console.log(
    "✓  Catálogo de exemplo (categoria, subcategoria, tipo, coleção, produto + EAN-13 + estoque seed)",
  );

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
