/**
 * Exibe data na UI apenas como dd/MM/aaaa (sem hora), em pt-BR.
 */
export function formatDateBr(input: Date | string | number | null | undefined): string {
  if (input == null) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
