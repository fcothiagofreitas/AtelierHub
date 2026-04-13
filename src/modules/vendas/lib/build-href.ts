/**
 * Parâmetros de filtro da lista de vendas.
 * Parâmetros de UI do PDV (`pdv`, `edit`, `view`) não estão aqui: preservam-se ao
 * aplicar filtros via `mergeVendasFiltersFromForm`.
 */
export const VENDAS_FILTER_PARAM_KEYS = [
  "preset",
  "busca",
  "from",
  "to",
  "estado",
  "estadoAberto",
  "clienteId",
  "vendedorId",
  "corretorId",
] as const;

/** Monta query string para `/vendas` preservando filtros ao mudar um parâmetro. */
export function buildVendasHref(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "") next.delete(k);
    else next.set(k, v);
  }
  const s = next.toString();
  return s ? `/vendas?${s}` : "/vendas";
}

/**
 * Substitui só os parâmetros de filtro na query atual (preserva `pdv`, `edit`, etc.).
 */
export function mergeVendasFiltersFromForm(
  current: URLSearchParams | Readonly<URLSearchParams>,
  form: HTMLFormElement,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  const fd = new FormData(form);
  for (const key of VENDAS_FILTER_PARAM_KEYS) {
    next.delete(key);
  }
  for (const key of VENDAS_FILTER_PARAM_KEYS) {
    const v = fd.get(key);
    if (typeof v === "string" && v.trim() !== "") {
      next.set(key, v.trim());
    }
  }
  const estadoFd = fd.get("estado");
  if (!estadoFd || String(estadoFd).trim() === "") {
    const ea = fd.get("estadoAberto");
    if (ea === "1") next.set("estadoAberto", "1");
  }
  return next;
}
