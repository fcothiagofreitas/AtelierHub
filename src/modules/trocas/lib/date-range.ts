import type { Prisma } from "@prisma/client";

export type TrocasSearchParams = {
  preset?: string;
  from?: string;
  to?: string;
  estado?: string;
  clienteId?: string;
  vendedorId?: string;
  busca?: string;
};

export function parseTrocasSearchParams(
  sp: Record<string, string | string[] | undefined>,
): TrocasSearchParams {
  const g = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };
  return {
    preset: g("preset") || undefined,
    from: g("from") || undefined,
    to: g("to") || undefined,
    estado: g("estado") || undefined,
    clienteId: g("clienteId") || undefined,
    vendedorId: g("vendedorId") || undefined,
    busca: g("busca").trim() || undefined,
  };
}

function localDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localDayEnd(d: Date): Date {
  const s = localDayStart(d);
  return new Date(s.getTime() + 86400000 - 1);
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function rangeFromPreset(preset: string | undefined): { from: Date; to: Date } | null {
  if (!preset) return null;
  const now = new Date();
  const todayStart = localDayStart(now);
  const todayEnd = localDayEnd(now);

  switch (preset) {
    case "hoje":
      return { from: todayStart, to: todayEnd };
    case "ontem": {
      const y = new Date(todayStart.getTime() - 86400000);
      return { from: localDayStart(y), to: localDayEnd(y) };
    }
    case "7d": {
      const from = new Date(todayStart.getTime() - 6 * 86400000);
      return { from, to: todayEnd };
    }
    case "30d": {
      const from = new Date(todayStart.getTime() - 29 * 86400000);
      return { from, to: todayEnd };
    }
    case "semana": {
      const day = now.getDay();
      const offsetFromMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(todayStart.getTime() - offsetFromMonday * 86400000);
      return { from: monday, to: todayEnd };
    }
    case "mes": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first, to: todayEnd };
    }
    default:
      return null;
  }
}

export function createdAtWhereFromTrocasParams(
  p: TrocasSearchParams,
): Prisma.DateTimeFilter | undefined {
  const customFrom = p.from ? parseYmd(p.from) : null;
  const customTo = p.to ? parseYmd(p.to) : null;
  if (customFrom && customTo) {
    return {
      gte: localDayStart(customFrom),
      lte: localDayEnd(customTo),
    };
  }
  if (customFrom && !customTo) {
    return { gte: localDayStart(customFrom) };
  }
  if (!customFrom && customTo) {
    return { lte: localDayEnd(customTo) };
  }

  const presetRange = rangeFromPreset(p.preset);
  if (!presetRange) return undefined;
  return {
    gte: presetRange.from,
    lte: presetRange.to,
  };
}
