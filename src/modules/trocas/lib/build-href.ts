export const TROCAS_FILTER_PARAM_KEYS = [
  "preset",
  "busca",
  "from",
  "to",
  "estado",
  "clienteId",
  "vendedorId",
] as const;

export function buildTrocasHref(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "") next.delete(k);
    else next.set(k, v);
  }
  const s = next.toString();
  return s ? `/trocas?${s}` : "/trocas";
}

export function mergeTrocasFiltersFromForm(
  current: URLSearchParams | Readonly<URLSearchParams>,
  form: HTMLFormElement,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  const fd = new FormData(form);
  for (const key of TROCAS_FILTER_PARAM_KEYS) {
    next.delete(key);
  }
  for (const key of TROCAS_FILTER_PARAM_KEYS) {
    const v = fd.get(key);
    if (typeof v === "string" && v.trim() !== "") {
      next.set(key, v.trim());
    }
  }
  return next;
}

export function clearTrocasFiltersHref(current: URLSearchParams): string {
  const next = new URLSearchParams(current.toString());
  for (const key of TROCAS_FILTER_PARAM_KEYS) {
    next.delete(key);
  }
  const s = next.toString();
  return s ? `/trocas?${s}` : "/trocas";
}
