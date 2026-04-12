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
