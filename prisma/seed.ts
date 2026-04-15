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
  FormaPagamento,
  GrupoCobrancaTipo,
  ComissaoTipo,
  BalancoEstoqueEstado,
} from "@prisma/client";
import { buildEan13FromBody12 } from "../src/lib/ean13";
import { formatNomeGrade } from "../src/lib/produto-grade";
import { entradaManualEstoque } from "../src/modules/estoque/estoque-service";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function eanSeq(n: number) {
  return buildEan13FromBody12(`789${String(n).padStart(9, "0")}`);
}

async function main() {
  console.log("🌱  Iniciando seed completo (ambiente de teste)...\n");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "brand-demo" },
    update: { percentualComissaoVendedorPadrao: 2, prazoTrocaDias: 30 },
    create: {
      name: "Marca Demo",
      slug: "brand-demo",
      percentualComissaoVendedorPadrao: 2,
      prazoTrocaDias: 30,
    },
  });

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

  // Ordem respeita FKs (ex.: MovimentoCorretor → Corretor; Cliente → Corretor)
  await prisma.trocaItem.deleteMany({ where: { troca: { tenantId: tenant.id } } });
  await prisma.troca.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.lancamentoComissao.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.movimentoCorretor.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.grupoCobrancaPedido.deleteMany({ where: { grupo: { tenantId: tenant.id } } });
  await prisma.grupoCobranca.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.pagamento.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.pedidoItem.deleteMany({ where: { pedido: { tenantId: tenant.id } } });
  await prisma.pedido.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.balancoEstoqueItem.deleteMany({ where: { balanco: { tenantId: tenant.id } } });
  await prisma.balancoEstoque.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.cliente.deleteMany({ where: { tenantId: tenant.id } });

  await prisma.movimentoEstoque.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.estoqueSaldo.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.produto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.catalogoCor.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.opcaoTamanho.deleteMany({
    where: { gradeTamanho: { tenantId: tenant.id } },
  });
  await prisma.gradeTamanho.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.subcategoriaProduto.deleteMany({
    where: { categoria: { tenantId: tenant.id } },
  });
  await prisma.categoriaProduto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tipoProduto.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.colecaoProduto.deleteMany({ where: { tenantId: tenant.id } });

  await prisma.corretor.deleteMany({ where: { tenantId: tenant.id } });
  const corretores = await prisma.$transaction([
    prisma.corretor.create({
      data: {
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
    }),
    prisma.corretor.create({
      data: {
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
    }),
    prisma.corretor.create({
      data: {
        tenantId: tenant.id,
        name: "Corretor Inativo (seed)",
        email: "corretor.inativo@demo.com",
        commissionPercent: 3,
        paymentMethod: CorretorPaymentMethod.CASH,
        isActive: false,
        isBlocked: false,
      },
    }),
  ]);
  const [corretorIlimitado, corretorTeto] = [corretores[0]!, corretores[1]!];

  type ColabSeed = {
    name: string;
    role: UserRole;
    stores: string[];
    defaultStore: string;
    login: { email: string; password: string };
    minCommission?: number;
  };

  const colaboradoresData: ColabSeed[] = [
    {
      name: "Admin da Marca",
      role: UserRole.ADMIN_DA_MARCA,
      stores: [storeAdmin.id, storeAldeia.id, storeCentro.id],
      defaultStore: storeAdmin.id,
      login: { email: "admin@demo.com", password: "admin123" },
    },
    {
      name: "Equipe Administrativa",
      role: UserRole.ADMINISTRATIVO,
      stores: [storeAdmin.id, storeAldeia.id],
      defaultStore: storeAdmin.id,
      login: { email: "administrativo@demo.com", password: "demo123" },
    },
    {
      name: "Gerente Aldeota",
      role: UserRole.GERENTE_LOJA,
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
      login: { email: "gerente@demo.com", password: "gerente123" },
    },
    {
      name: "Gerente Centro",
      role: UserRole.GERENTE_LOJA,
      stores: [storeCentro.id],
      defaultStore: storeCentro.id,
      login: { email: "gerente.centro@demo.com", password: "gerente123" },
    },
    {
      name: "Camila Vendedora",
      role: UserRole.VENDEDOR,
      stores: [storeAldeia.id],
      defaultStore: storeAldeia.id,
      minCommission: 1.5,
      login: { email: "vendedor@demo.com", password: "vendedor123" },
    },
    {
      name: "Bruno Vendedor Centro",
      role: UserRole.VENDEDOR,
      stores: [storeCentro.id],
      defaultStore: storeCentro.id,
      minCommission: 2,
      login: { email: "vendedor.centro@demo.com", password: "vendedor123" },
    },
  ];

  for (const data of colaboradoresData) {
    const passwordHash = await hash(data.login.password);
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: data.login.email } },
      update: {
        passwordHash,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        email: data.login.email,
        passwordHash,
        isActive: true,
      },
    });

    const colaborador = await prisma.colaborador.upsert({
      where: { userId: user.id },
      update: {
        name: data.name,
        role: data.role,
        isActive: true,
        minCommission: data.minCommission ?? 0,
      },
      create: {
        tenantId: tenant.id,
        name: data.name,
        role: data.role,
        isActive: true,
        minCommission: data.minCommission ?? 0,
        userId: user.id,
      },
    });

    await prisma.colaboradorStore.deleteMany({ where: { colaboradorId: colaborador.id } });
    await prisma.colaboradorStore.createMany({
      data: data.stores.map((storeId) => ({
        colaboradorId: colaborador.id,
        storeId,
        isDefault: storeId === data.defaultStore,
      })),
    });

    console.log(`✓  ${colaborador.name} — ${data.login.email} / ${data.login.password}`);
  }

  const catVest = await prisma.categoriaProduto.create({
    data: {
      tenantId: tenant.id,
      nome: "Vestuário",
      slug: "vestuario",
      ordem: 0,
      isActive: true,
    },
  });
  const catAcess = await prisma.categoriaProduto.create({
    data: {
      tenantId: tenant.id,
      nome: "Acessórios",
      slug: "acessorios",
      ordem: 1,
      isActive: true,
    },
  });

  const subCalcas = await prisma.subcategoriaProduto.create({
    data: { categoriaId: catVest.id, nome: "Calças", slug: "calcas", ordem: 0, isActive: true },
  });
  const subCamis = await prisma.subcategoriaProduto.create({
    data: { categoriaId: catVest.id, nome: "Camisetas", slug: "camisetas", ordem: 1, isActive: true },
  });
  const subCintos = await prisma.subcategoriaProduto.create({
    data: { categoriaId: catAcess.id, nome: "Cintos", slug: "cintos", ordem: 0, isActive: true },
  });

  const tipoCalca = await prisma.tipoProduto.create({
    data: { tenantId: tenant.id, nome: "Calça", slug: "calca", ordem: 0, isActive: true },
  });
  const tipoCami = await prisma.tipoProduto.create({
    data: { tenantId: tenant.id, nome: "Camiseta", slug: "camiseta", ordem: 1, isActive: true },
  });
  const tipoCinto = await prisma.tipoProduto.create({
    data: { tenantId: tenant.id, nome: "Cinto", slug: "cinto", ordem: 2, isActive: true },
  });

  const colVerao = await prisma.colecaoProduto.create({
    data: { tenantId: tenant.id, nome: "Verão 2026", slug: "verao-2026", ordem: 0, isActive: true },
  });
  const colBasico = await prisma.colecaoProduto.create({
    data: { tenantId: tenant.id, nome: "Linha Básica", slug: "linha-basica", ordem: 1, isActive: true },
  });

  const gradeLetras = await prisma.gradeTamanho.create({
    data: { tenantId: tenant.id, nome: "Letras", slug: "letras", ordem: 0, isActive: true },
  });
  const gradeNum = await prisma.gradeTamanho.create({
    data: { tenantId: tenant.id, nome: "Numérico adulto", slug: "numerico-adulto", ordem: 1, isActive: true },
  });

  const opUnico = await prisma.opcaoTamanho.create({
    data: { gradeTamanhoId: gradeLetras.id, nome: "Único", slug: "unico", ordem: 0, isActive: true },
  });
  const opP = await prisma.opcaoTamanho.create({
    data: { gradeTamanhoId: gradeNum.id, nome: "P", slug: "p", ordem: 0, isActive: true },
  });
  const opM = await prisma.opcaoTamanho.create({
    data: { gradeTamanhoId: gradeNum.id, nome: "M", slug: "m", ordem: 1, isActive: true },
  });
  const opG = await prisma.opcaoTamanho.create({
    data: { gradeTamanhoId: gradeNum.id, nome: "G", slug: "g", ordem: 2, isActive: true },
  });

  const corAzul = await prisma.catalogoCor.create({
    data: { tenantId: tenant.id, nome: "Azul", slug: "azul", ordem: 0, isActive: true },
  });
  const corPreto = await prisma.catalogoCor.create({
    data: { tenantId: tenant.id, nome: "Preto", slug: "preto", ordem: 1, isActive: true },
  });
  const corBranco = await prisma.catalogoCor.create({
    data: { tenantId: tenant.id, nome: "Branco", slug: "branco", ordem: 2, isActive: true },
  });

  let eanN = 1;
  const prodCalca = await prisma.produto.create({
    data: {
      tenantId: tenant.id,
      referencia: "SEED-CALCA-001",
      nome: "Calça jeans reta (seed)",
      descricao: "Duas variações de cor; NCM de exemplo.",
      categoriaId: catVest.id,
      subcategoriaId: subCalcas.id,
      tipoId: tipoCalca.id,
      colecaoId: colVerao.id,
      gradeTamanhoId: gradeLetras.id,
      precoVenda: new Prisma.Decimal("299.90"),
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
            ean13: eanSeq(eanN++),
            codigoExterno: "FORN-CALCA-AZ",
            ordem: 0,
          },
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opUnico.id,
            corCatalogoId: corPreto.id,
            nome: formatNomeGrade(opUnico.nome, corPreto.nome),
            ean13: eanSeq(eanN++),
            codigoExterno: "FORN-CALCA-PT",
            ordem: 1,
          },
        ],
      },
    },
    include: { variacoes: true },
  });

  const prodCamis = await prisma.produto.create({
    data: {
      tenantId: tenant.id,
      referencia: "SEED-CAMI-001",
      nome: "Camiseta malha (seed)",
      descricao: "Grade P/M/G, cor branca.",
      categoriaId: catVest.id,
      subcategoriaId: subCamis.id,
      tipoId: tipoCami.id,
      colecaoId: colBasico.id,
      gradeTamanhoId: gradeNum.id,
      precoVenda: new Prisma.Decimal("79.90"),
      isActive: true,
      ncm: "61091000",
      origemMercadoria: 0,
      unidadeTributavel: "UN",
      variacoes: {
        create: [
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opP.id,
            corCatalogoId: corBranco.id,
            nome: formatNomeGrade(opP.nome, corBranco.nome),
            ean13: eanSeq(eanN++),
            ordem: 0,
          },
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opM.id,
            corCatalogoId: corBranco.id,
            nome: formatNomeGrade(opM.nome, corBranco.nome),
            ean13: eanSeq(eanN++),
            ordem: 1,
          },
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opG.id,
            corCatalogoId: corBranco.id,
            nome: formatNomeGrade(opG.nome, corBranco.nome),
            ean13: eanSeq(eanN++),
            ordem: 2,
          },
        ],
      },
    },
    include: { variacoes: true },
  });

  const prodCinto = await prisma.produto.create({
    data: {
      tenantId: tenant.id,
      referencia: "SEED-CINTO-001",
      nome: "Cinto couro (seed)",
      categoriaId: catAcess.id,
      subcategoriaId: subCintos.id,
      tipoId: tipoCinto.id,
      colecaoId: colBasico.id,
      gradeTamanhoId: gradeLetras.id,
      precoVenda: new Prisma.Decimal("129.00"),
      isActive: true,
      unidadeTributavel: "UN",
      variacoes: {
        create: [
          {
            tenantId: tenant.id,
            opcaoTamanhoId: opUnico.id,
            corCatalogoId: corPreto.id,
            nome: formatNomeGrade(opUnico.nome, corPreto.nome),
            ean13: eanSeq(eanN++),
            ordem: 0,
          },
        ],
      },
    },
    include: { variacoes: true },
  });

  const vCalcaAzul = prodCalca.variacoes.find((v) => v.corCatalogoId === corAzul.id)!;
  const vCalcaPto = prodCalca.variacoes.find((v) => v.corCatalogoId === corPreto.id)!;
  const vCamiM = prodCamis.variacoes.find((v) => v.opcaoTamanhoId === opM.id)!;
  const vCinto = prodCinto.variacoes[0]!;

  const vendedora = await prisma.colaborador.findFirst({
    where: { tenantId: tenant.id, user: { email: "vendedor@demo.com" } },
  });
  const vendedorCentro = await prisma.colaborador.findFirst({
    where: { tenantId: tenant.id, user: { email: "vendedor.centro@demo.com" } },
  });

  const clientesRows = await prisma.$transaction([
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
        corretorId: corretorIlimitado.id,
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
    prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        tipo: ClienteTipo.PF,
        nome: "Paula Compradora",
        cpf: "98765432100",
        telefone: "85991234001",
        email: "paula@seed.demo",
        isActive: true,
        creditoTroca: new Prisma.Decimal("45.00"),
      },
    }),
    prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        storeId: storeCentro.id,
        tipo: ClienteTipo.PF,
        nome: "Ricardo Centro",
        cpf: "11122233344",
        email: "ricardo@seed.demo",
        isActive: true,
      },
    }),
    prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        storeId: storeCentro.id,
        tipo: ClienteTipo.PJ,
        fantasia: "Boutique Centro",
        razaoSocial: "Boutique Centro LTDA",
        cnpj: "99888777000166",
        ieIsento: true,
        email: "financeiro@boutiquecentro.demo",
        isActive: true,
      },
    }),
  ]);

  const [cliHelena, cliPj, cliPaula, cliRicardo, cliBoutique] = clientesRows;

  if (!vendedora || !vendedorCentro) {
    throw new Error("Seed: colaboradores vendedores não encontrados.");
  }

  // Estoque inicial (várias SKUs × lojas)
  for (const [storeId, qty] of [
    [storeAldeia.id, 8],
    [storeCentro.id, 5],
    [storeAdmin.id, 15],
  ] as const) {
    for (const vid of [vCalcaAzul.id, vCalcaPto.id, vCamiM.id, vCinto.id]) {
      await entradaManualEstoque({
        tenantId: tenant.id,
        userId: null,
        storeId,
        produtoVariacaoId: vid,
        quantidade: qty,
      });
    }
  }

  // Pedidos Aldeota
  const p1 = await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 1,
      clienteId: cliHelena.id,
      vendedorId: vendedora.id,
      corretorId: corretorIlimitado.id,
      estado: PedidoEstado.EM_ABERTO,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("299.90"),
      itens: {
        create: [{ produtoVariacaoId: vCalcaAzul.id, quantidade: 1, precoUnitario: new Prisma.Decimal("299.90") }],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 2,
      clienteId: cliPj.id,
      vendedorId: vendedora.id,
      corretorId: null,
      estado: PedidoEstado.EM_ANDAMENTO,
      modalidade: PedidoModalidade.CONSIGNADA,
      total: null,
      itens: {
        create: [{ produtoVariacaoId: vCalcaPto.id, quantidade: 2, precoUnitario: new Prisma.Decimal("310.00") }],
      },
    },
  });

  const p3 = await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 3,
      clienteId: cliHelena.id,
      vendedorId: vendedora.id,
      corretorId: null,
      estado: PedidoEstado.QUITADO,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("159.80"),
      createdAt: new Date("2025-11-10T15:30:00.000Z"),
      itens: {
        create: [{ produtoVariacaoId: vCamiM.id, quantidade: 2, precoUnitario: new Prisma.Decimal("79.90") }],
      },
      pagamentos: {
        create: [
          { tenantId: tenant.id, forma: FormaPagamento.PIX, valor: new Prisma.Decimal("100.00") },
          { tenantId: tenant.id, forma: FormaPagamento.CARTAO_DEBITO, valor: new Prisma.Decimal("59.80") },
        ],
      },
    },
  });

  await prisma.lancamentoComissao.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      pedidoId: p3.id,
      tipo: ComissaoTipo.VENDEDOR,
      colaboradorId: vendedora.id,
      baseCalculo: new Prisma.Decimal("159.80"),
      percentual: 1.5,
      valor: new Prisma.Decimal("2.40"),
    },
  });

  const p4 = await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 4,
      clienteId: cliPaula.id,
      vendedorId: vendedora.id,
      corretorId: corretorTeto.id,
      estado: PedidoEstado.PAGO_PARCIAL,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("258.00"),
      itens: {
        create: [{ produtoVariacaoId: vCalcaAzul.id, quantidade: 1, precoUnitario: new Prisma.Decimal("258.00") }],
      },
      pagamentos: {
        create: [{ tenantId: tenant.id, forma: FormaPagamento.PIX, valor: new Prisma.Decimal("100.00") }],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 5,
      clienteId: cliHelena.id,
      vendedorId: vendedora.id,
      estado: PedidoEstado.CANCELADO,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("50.00"),
      itens: {
        create: [{ produtoVariacaoId: vCinto.id, quantidade: 1, precoUnitario: new Prisma.Decimal("50.00") }],
      },
    },
  });

  // Rascunho sem cliente
  await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      numero: 6,
      clienteId: null,
      vendedorId: vendedora.id,
      estado: PedidoEstado.EM_ANDAMENTO,
      modalidade: PedidoModalidade.DIRETA,
      total: null,
      itens: {
        create: [{ produtoVariacaoId: vCalcaAzul.id, quantidade: 1, precoUnitario: new Prisma.Decimal("299.90") }],
      },
    },
  });

  // Loja Centro
  await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeCentro.id,
      numero: 1,
      clienteId: cliRicardo.id,
      vendedorId: vendedorCentro.id,
      estado: PedidoEstado.EM_ABERTO,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("129.00"),
      itens: {
        create: [{ produtoVariacaoId: vCinto.id, quantidade: 1, precoUnitario: new Prisma.Decimal("129.00") }],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      tenantId: tenant.id,
      storeId: storeCentro.id,
      numero: 2,
      clienteId: cliBoutique.id,
      vendedorId: vendedorCentro.id,
      estado: PedidoEstado.QUITADO,
      modalidade: PedidoModalidade.DIRETA,
      total: new Prisma.Decimal("79.90"),
      itens: {
        create: [{ produtoVariacaoId: vCamiM.id, quantidade: 1, precoUnitario: new Prisma.Decimal("79.90") }],
      },
      pagamentos: {
        create: [{ tenantId: tenant.id, forma: FormaPagamento.DINHEIRO, valor: new Prisma.Decimal("79.90") }],
      },
    },
  });

  // Grupo de cobrança (2 pedidos em aberto mesmo cliente)
  const grupo = await prisma.grupoCobranca.create({
    data: {
      tenantId: tenant.id,
      storeId: storeAldeia.id,
      tipo: GrupoCobrancaTipo.CLIENTE,
      clienteId: cliPaula.id,
      criadoPorId: vendedora.id,
      itens: {
        create: [
          { pedidoId: p1.id, ordem: 0 },
          { pedidoId: p4.id, ordem: 1 },
        ],
      },
    },
  });
  console.log(`✓  Grupo de cobrança cliente: ${grupo.id.slice(0, 8)}… (pedidos #1 e #4 Aldeota)`);

  // Balanço em rascunho (Loja Aldeota)
  const saldoAzul = await prisma.estoqueSaldo.findUnique({
    where: { storeId_produtoVariacaoId: { storeId: storeAldeia.id, produtoVariacaoId: vCalcaAzul.id } },
  });
  const saldoCami = await prisma.estoqueSaldo.findUnique({
    where: { storeId_produtoVariacaoId: { storeId: storeAldeia.id, produtoVariacaoId: vCamiM.id } },
  });
  if (saldoAzul && saldoCami) {
    const bal = await prisma.balancoEstoque.create({
      data: {
        tenantId: tenant.id,
        storeId: storeAldeia.id,
        numero: 1,
        estado: BalancoEstoqueEstado.RASCUNHO,
        observacoes: "Seed — conferir jeans azul e camiseta M",
        criadoPorId: vendedora.id,
        itens: {
          create: [
            {
              produtoVariacaoId: vCalcaAzul.id,
              saldoSnapshot: saldoAzul.quantidade,
              quantidadeContada: null,
            },
            {
              produtoVariacaoId: vCamiM.id,
              saldoSnapshot: saldoCami.quantidade,
              quantidadeContada: null,
            },
          ],
        },
      },
    });
    console.log(`✓  Balanço rascunho #${bal.numero} (Aldeota)`);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { eanSequence: eanN },
  });

  console.log("\n✅  Seed concluído.");
  console.log("\n📌  Logins (todos com colaborador vinculado):");
  console.log("   admin@demo.com           / admin123      — Admin da marca");
  console.log("   administrativo@demo.com  / demo123       — Administrativo");
  console.log("   gerente@demo.com         / gerente123    — Gerente Aldeota");
  console.log("   gerente.centro@demo.com  / gerente123    — Gerente Centro");
  console.log("   vendedor@demo.com        / vendedor123   — Vendedor Aldeota");
  console.log("   vendedor.centro@demo.com / vendedor123   — Vendedor Centro");
  console.log("\n📦  Dados: 3 categorias, 6 clientes, 3 produtos (8+ SKUs), pedidos em ambas as lojas,");
  console.log("   grupo de cobrança, comissão exemplo, balanço rascunho, estoque nas 3 lojas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
