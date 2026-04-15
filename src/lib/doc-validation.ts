/**
 * Valida CPF usando o algoritmo de dígitos verificadores.
 * Espera string com exatamente 11 dígitos (sem pontuação).
 */
export function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // rejeita sequências uniformes (00000000000, etc.)

  const digits = cpf.split("").map(Number);

  const calcDigit = (weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  if (calcDigit([10, 9, 8, 7, 6, 5, 4, 3, 2]) !== digits[9]) return false;
  if (calcDigit([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) !== digits[10]) return false;
  return true;
}

/**
 * Valida CNPJ usando o algoritmo de dígitos verificadores.
 * Espera string com exatamente 14 dígitos (sem pontuação).
 */
export function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // rejeita sequências uniformes

  const digits = cnpj.split("").map(Number);

  const calcDigit = (weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  if (calcDigit([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) !== digits[12]) return false;
  if (calcDigit([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) !== digits[13]) return false;
  return true;
}
