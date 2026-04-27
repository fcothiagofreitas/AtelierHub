import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateBr } from "@/lib/format-date-br";
import { formatCnpjDisplay, formatCpfDisplay } from "@/lib/masks-br";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const moneyPlain = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function esc(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Quebra por palavras para largura aproximada em caracteres (Helvetica 8pt). */
function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const BOTTOM_MIN = 52;

export type PedidoVendaPdfLinha = {
  ean: string;
  ref: string;
  descricao: string;
  valorUnit: number;
  quantidade: number;
  totalLinha: number;
  unidade: string;
};

export type PedidoVendaPdfInput = {
  tenantNome: string;
  lojaNome: string;
  pedidoNumero: number;
  criadoEm: Date;
  estadoLabel: string;
  cliente: {
    nomeExibicao: string;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    documentoLinha: string;
  } | null;
  linhas: PedidoVendaPdfLinha[];
  totalPedido: number;
  totalProdutos: number;
  totalUnidadesItens: number;
  pagamentos: { data: Date; formaLabel: string; valor: number }[];
  totalPago: number;
  entregueEm: Date | null;
  modalidadeEntregaLabel: string | null;
  observacoes: string | null;
  vendedorNome: string;
};

type FontPair = {
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

type Ctx = {
  pdf: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
  f: FontPair;
  black: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  lineGray: ReturnType<typeof rgb>;
};

function ensureSpace(ctx: Ctx, need: number): void {
  if (ctx.y - need < BOTTOM_MIN) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - M;
  }
}

function textLine(
  ctx: Ctx,
  t: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
): void {
  const size = opts.size ?? 9;
  const font = opts.bold ? ctx.f.fontBold : ctx.f.font;
  ensureSpace(ctx, size + 6);
  ctx.page.drawText(t, {
    x: M,
    y: ctx.y,
    size,
    font,
    color: opts.color ?? ctx.black,
    maxWidth: PAGE_W - 2 * M,
  });
  ctx.y -= size + (size <= 8 ? 2 : 4);
}

function drawRightAt(
  ctx: Ctx,
  text: string,
  xRight: number,
  y: number,
  size: number,
  bold = false,
): void {
  const font = bold ? ctx.f.fontBold : ctx.f.font;
  const w = font.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: xRight - w,
    y,
    size,
    font,
    color: ctx.black,
  });
}

/** Gera PDF estilo «Pedido de Venda» (A4, Helvetica). */
export async function buildPedidoVendaPdf(
  input: PedidoVendaPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.38, 0.38, 0.38);
  const lineGray = rgb(0.75, 0.75, 0.75);
  const f: FontPair = { font, fontBold };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const ctx: Ctx = { pdf, page, y, f, black, muted, lineGray };

  const logoW = 100;
  const logoH = 36;
  page.drawRectangle({
    x: M,
    y: y - logoH,
    width: logoW,
    height: logoH,
    borderColor: lineGray,
    borderWidth: 0.75,
  });
  const logoLabel = "[Logotipo]";
  const lw = font.widthOfTextAtSize(logoLabel, 8);
  page.drawText(logoLabel, {
    x: M + (logoW - lw) / 2,
    y: y - logoH / 2 - 3,
    size: 8,
    font,
    color: muted,
  });

  const title = "Pedido de Venda";
  const titleSize = 14;
  const tw = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: PAGE_W - M - tw,
    y: y - 4,
    size: titleSize,
    font: fontBold,
    color: black,
  });
  y -= logoH + 10;
  ctx.page = page;
  ctx.y = y;

  textLine(ctx, esc(input.tenantNome, 70), { size: 10, bold: true });
  textLine(ctx, `Loja: ${esc(input.lojaNome, 72)}`, { size: 9 });
  textLine(ctx, "CNPJ / telefone / e-mail / endereço: —", {
    size: 8,
    color: muted,
  });
  ctx.y -= 4;

  const dtCriado = formatDateBr(input.criadoEm);
  textLine(ctx, `N.º ${input.pedidoNumero}    Data: ${dtCriado}`, { size: 9 });
  textLine(ctx, `Situação do pedido: ${input.estadoLabel}`, { size: 9, bold: true });
  ctx.y -= 6;

  textLine(ctx, "Cliente", { size: 10, bold: true });
  if (input.cliente) {
    textLine(ctx, esc(input.cliente.nomeExibicao, 85), { size: 9 });
    textLine(
      ctx,
      `Endereço: ${input.cliente.endereco?.trim() ? esc(input.cliente.endereco, 80) : "—"}`,
      { size: 8 },
    );
    const tel = input.cliente.telefone?.trim()
      ? esc(input.cliente.telefone, 40)
      : "—";
    const em = input.cliente.email?.trim()
      ? esc(input.cliente.email, 48)
      : "—";
    textLine(ctx, `Telefones / e-mail: ${tel}  ·  ${em}`, { size: 8 });
    textLine(ctx, input.cliente.documentoLinha, { size: 8 });
  } else {
    textLine(ctx, "—", { size: 9 });
  }
  ctx.y -= 4;
  textLine(ctx, "Moeda: R$", { size: 9, bold: true });
  ctx.y -= 4;

  textLine(ctx, "Produtos e serviços", { size: 10, bold: true });
  ctx.y -= 2;

  const fs = 7;
  const col = {
    ean: M,
    ref: M + 78,
    desc: M + 128,
    vu: PAGE_W - M - 168,
    qtd: PAGE_W - M - 118,
    tot: PAGE_W - M - 68,
    un: PAGE_W - M - 28,
  };

  ensureSpace(ctx, 16);
  page = ctx.page;
  const hdrY = ctx.y;
  page.drawText("EAN", { x: col.ean, y: hdrY, size: fs, font: fontBold, color: black });
  page.drawText("Ref.", { x: col.ref, y: hdrY, size: fs, font: fontBold, color: black });
  page.drawText("Descrição", {
    x: col.desc,
    y: hdrY,
    size: fs,
    font: fontBold,
    color: black,
  });
  drawRightAt(ctx, "V. unit.", col.vu + 48, hdrY, fs, true);
  drawRightAt(ctx, "Qtd", col.qtd + 22, hdrY, fs, true);
  drawRightAt(ctx, "Total", col.tot + 48, hdrY, fs, true);
  page.drawText("UN", { x: col.un, y: hdrY, size: fs, font: fontBold, color: black });
  ctx.y = hdrY - fs - 3;
  page.drawLine({
    start: { x: M, y: ctx.y + 1 },
    end: { x: PAGE_W - M, y: ctx.y + 1 },
    thickness: 0.4,
    color: lineGray,
  });
  ctx.y -= 5;

  for (const lin of input.linhas) {
    ensureSpace(ctx, 20);
    page = ctx.page;
    const rowY = ctx.y;
    page.drawText(esc(lin.ean || "—", 13), {
      x: col.ean,
      y: rowY,
      size: fs,
      font,
      color: black,
    });
    page.drawText(esc(lin.ref || "—", 8), {
      x: col.ref,
      y: rowY,
      size: fs,
      font,
      color: black,
    });
    page.drawText(esc(lin.descricao, 42), {
      x: col.desc,
      y: rowY,
      size: fs,
      font,
      color: black,
      maxWidth: col.vu - col.desc - 6,
    });
    drawRightAt(ctx, moneyPlain.format(lin.valorUnit), col.vu + 48, rowY, fs);
    drawRightAt(ctx, String(lin.quantidade), col.qtd + 22, rowY, fs);
    drawRightAt(ctx, moneyPlain.format(lin.totalLinha), col.tot + 48, rowY, fs);
    page.drawText(esc(lin.unidade, 4), {
      x: col.un,
      y: rowY,
      size: fs,
      font,
      color: black,
    });
    ctx.y = rowY - fs - 3;
  }

  ctx.y -= 4;
  textLine(ctx, `Total produtos: ${moneyPlain.format(input.totalProdutos)}`, {
    size: 9,
    bold: true,
  });
  textLine(ctx, "Acréscimo (+): 0,00", { size: 8, color: muted });
  textLine(ctx, "Desconto (-): 0,00", { size: 8, color: muted });
  textLine(ctx, "Vale troca (-): 0,00", { size: 8, color: muted });
  textLine(ctx, `Total líquido: ${moneyPlain.format(input.totalPedido)}`, {
    size: 10,
    bold: true,
  });
  textLine(ctx, `Total de itens (unidades): ${input.totalUnidadesItens}`, {
    size: 8,
  });
  ctx.y -= 6;

  textLine(ctx, "Pagamento", { size: 10, bold: true });
  if (input.pagamentos.length === 0) {
    textLine(ctx, "Nenhum pagamento registado.", { size: 8, color: muted });
  } else {
    for (const p of input.pagamentos) {
      const dt = formatDateBr(p.data);
      ensureSpace(ctx, 12);
      page = ctx.page;
      const py = ctx.y;
      page.drawText(`${dt} — ${esc(p.formaLabel, 36)}`, {
        x: M,
        y: py,
        size: 8,
        font,
        color: black,
      });
      drawRightAt(ctx, money.format(p.valor), PAGE_W - M, py, 8);
      ctx.y = py - 11;
    }
    textLine(ctx, `Total pago: ${money.format(input.totalPago)}`, {
      size: 9,
      bold: true,
    });
  }
  ctx.y -= 4;

  if (input.entregueEm || input.modalidadeEntregaLabel) {
    textLine(ctx, "Entrega", { size: 10, bold: true });
    if (input.entregueEm) {
      const de = formatDateBr(input.entregueEm);
      textLine(ctx, `Registada em: ${de}`, { size: 8 });
    }
    if (input.modalidadeEntregaLabel) {
      textLine(ctx, `Modalidade: ${input.modalidadeEntregaLabel}`, {
        size: 8,
      });
    }
    ctx.y -= 4;
  }

  if (input.observacoes?.trim()) {
    textLine(ctx, "Observações", { size: 10, bold: true });
    for (const ln of wrapLines(input.observacoes.trim(), 92)) {
      textLine(ctx, ln, { size: 8 });
    }
    ctx.y -= 4;
  }

  textLine(ctx, `Vendedor: ${esc(input.vendedorNome, 70)}`, { size: 9 });
  ctx.y -= 8;

  ensureSpace(ctx, 14);
  page = ctx.page;
  page.drawText(`Página 1 · ${esc(input.tenantNome, 50)}`, {
    x: M,
    y: ctx.y,
    size: 7,
    font,
    color: muted,
  });

  return pdf.save();
}

/** Compat: nome antigo da API de PDF. */
export const buildReciboPedidoPdf = buildPedidoVendaPdf;

export function clienteDocumentoReciboPdf(input: {
  tipo: "PF" | "PJ";
  cpf: string | null;
  cnpj: string | null;
  ie: string | null;
  ieIsento: boolean;
}): string {
  if (input.tipo === "PF") {
    if (input.cpf?.replace(/\D/g, "")) {
      return `CPF: ${formatCpfDisplay(input.cpf)}`;
    }
    return "CPF: —";
  }
  const cnpj =
    input.cnpj?.replace(/\D/g, "") ?
      `CNPJ: ${formatCnpjDisplay(input.cnpj)}`
    : "CNPJ: —";
  const ie =
    input.ieIsento ? "IE: Isento"
    : input.ie?.trim() ? `IE: ${input.ie}`
    : "IE: —";
  return `${cnpj}    ${ie}`;
}
