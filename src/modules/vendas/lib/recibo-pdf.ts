import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function esc(s: string, max = 72): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export async function buildReciboPedidoPdf(input: {
  lojaNome: string;
  tenantNome: string;
  pedidoNumero: number;
  clienteNome: string;
  criadoEm: Date;
  pagamentos: { data: Date; formaLabel: string; valor: number }[];
  totalPedido: number;
  totalPago: number;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.35, 0.35, 0.35);

  let y = 800;
  const left = 50;
  const line = 14;

  const title = "Comprovante de recebimento";
  page.drawText(title, { x: left, y, size: 16, font: fontBold, color: black });
  y -= 28;

  page.drawText(esc(input.tenantNome, 60), {
    x: left,
    y,
    size: 11,
    font: fontBold,
    color: black,
  });
  y -= line;
  page.drawText(`Loja: ${esc(input.lojaNome, 64)}`, {
    x: left,
    y,
    size: 10,
    font,
    color: muted,
  });
  y -= line * 1.5;

  page.drawText(`Pedido nº ${input.pedidoNumero}`, {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: black,
  });
  y -= line;
  page.drawText(
    `Emitido em ${input.criadoEm.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    })}`,
    { x: left, y, size: 9, font, color: muted },
  );
  y -= line * 1.8;

  page.drawText(`Cliente: ${esc(input.clienteNome || "—", 70)}`, {
    x: left,
    y,
    size: 10,
    font,
    color: black,
  });
  y -= line * 2;

  page.drawText("Pagamentos registados neste documento", {
    x: left,
    y,
    size: 10,
    font: fontBold,
    color: black,
  });
  y -= line * 1.2;

  for (const p of input.pagamentos) {
    const dt = p.data.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    page.drawText(`${dt} — ${esc(p.formaLabel, 28)}`, {
      x: left,
      y,
      size: 9,
      font,
      color: black,
    });
    page.drawText(money.format(p.valor), {
      x: 420,
      y,
      size: 9,
      font,
      color: black,
    });
    y -= line;
    if (y < 120) break;
  }

  y -= line;
  page.drawText(`Total do pedido: ${money.format(input.totalPedido)}`, {
    x: left,
    y,
    size: 10,
    font,
    color: muted,
  });
  y -= line;
  page.drawText(`Total pago (acumulado): ${money.format(input.totalPago)}`, {
    x: left,
    y,
    size: 11,
    font: fontBold,
    color: black,
  });
  y -= line * 1.5;
  page.drawText(
    "Documento informativo. Conserve para o seu arquivo.",
    { x: left, y, size: 8, font, color: muted },
  );

  return pdf.save();
}
