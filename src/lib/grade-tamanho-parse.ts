/**
 * Lista de opções de tamanho a partir de texto livre (uma por linha ou vírgula/ponto-e-vírgulo).
 */
export function parseListaOpcoesTamanho(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}
