/** Calcula dígito verificador GTIN-13 a partir dos 12 primeiros dígitos (string só numérica). */
export function ean13CheckDigit12(body12: string): string {
  if (!/^\d{12}$/.test(body12)) {
    throw new Error("EAN-13: corpo deve ter exatamente 12 dígitos numéricos.");
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(body12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  const mod = sum % 10;
  return String(mod === 0 ? 0 : 10 - mod);
}

/** Valida string de 13 dígitos com DV correto. */
export function isValidEan13(code: string): boolean {
  const d = code.replace(/\D/g, "");
  if (d.length !== 13) return false;
  const check = ean13CheckDigit12(d.slice(0, 12));
  return check === d[12];
}

/** Monta EAN-13 completo a partir do corpo de 12 dígitos. */
export function buildEan13FromBody12(body12: string): string {
  return body12 + ean13CheckDigit12(body12);
}
