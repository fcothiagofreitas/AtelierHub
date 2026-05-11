import type { ZodError } from "zod";

/** Converte string vazia ou undefined em undefined (útil em transforms Zod). */
export function emptyToUndefined(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t === "" ? undefined : t;
}

/** Achata erros Zod num record simples campo → primeira mensagem de erro. */
export function flattenZodErrors(err: ZodError): Record<string, string> {
  const flat = err.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
  );
}

/**
 * Interpreta valor monetário em pt-BR (ex.: `1.234,56`, `150,50`).
 * Pontos são milhares; a última vírgula é o separador decimal.
 */
export function parseBRL(s: string): number {
  const t = s.replace(/\s/g, "").trim();
  if (!t) return 0;

  const comma = t.lastIndexOf(",");
  if (comma !== -1) {
    const intPart = t.slice(0, comma).replace(/\./g, "");
    const fracPart = t.slice(comma + 1).replace(/\./g, "");
    const normalized =
      fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const dotCount = (t.match(/\./g) ?? []).length;
  if (dotCount === 1 && /^[\d]+\.[\d]+$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }

  const withoutThousands = t.replace(/\./g, "");
  const n = Number(withoutThousands);
  return Number.isFinite(n) ? n : 0;
}
