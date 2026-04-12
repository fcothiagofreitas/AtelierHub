/** Parser compartilhado para limite em formulários (string → número ou ilimitado). */
export function parseCreditLimitField(raw: string | undefined): {
  ok: true;
  value: number | null;
} | { ok: false; message: string } {
  const s = raw?.trim() ?? "";
  if (s === "") return { ok: true, value: null };
  const n = Number(s.replace(",", "."));
  if (Number.isNaN(n)) return { ok: false, message: "Limite de crédito inválido" };
  if (n < 0) return { ok: false, message: "Limite deve ser ≥ 0" };
  return { ok: true, value: n };
}
