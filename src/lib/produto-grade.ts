/**
 * Rótulo exibido para cada SKU: `Tamanho — Cor` (derivado dos catálogos no servidor).
 */

export const GRADE_NOME_SEP = " — ";

export function formatNomeGrade(tamanho: string, cor: string): string {
  return `${tamanho.trim()}${GRADE_NOME_SEP}${cor.trim()}`;
}
