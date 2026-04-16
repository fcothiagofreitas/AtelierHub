/** Mantém só dígitos, truncando em `maxLen` quando definido. */
export function digitsOnly(raw: string, maxLen?: number): string {
  let d = raw.replace(/\D/g, "");
  if (maxLen !== undefined) d = d.slice(0, maxLen);
  return d;
}

/** Máscara visual CPF: `000.000.000-00` (entrada = só dígitos). */
export function formatCpfDisplay(digits: string): string {
  const d = digitsOnly(digits, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara visual CNPJ: `00.000.000/0000-00`. */
export function formatCnpjDisplay(digits: string): string {
  const d = digitsOnly(digits, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Telefone BR com DDD: fixo 10 dígitos `(00) 0000-0000`, celular 11 `(00) 00000-0000`.
 * Entrada: só dígitos (até 11).
 */
export function formatTelefoneBrDisplay(digits: string): string {
  const d = digitsOnly(digits, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const dd = d.slice(0, 2);
  const n = d.slice(2);
  if (n.length <= 4) return `(${dd}) ${n}`;
  if (d.length <= 10) {
    return `(${dd}) ${n.slice(0, 4)}-${n.slice(4)}`;
  }
  return `(${dd}) ${n.slice(0, 5)}-${n.slice(5, 9)}`;
}
