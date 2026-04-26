import { digitsOnly } from "@/lib/masks-br";

/**
 * DTO estável devolvido por `/api/cnpj/[cnpj]` após consulta (ex.: BrasilAPI).
 * Rate limits e indisponibilidade do provedor externo são esperados em produção.
 */
export type CnpjLookupDto = {
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  telefoneDigits: string;
  email: string;
};

const BRASIL_API_CNPJ_V1 = "https://brasilapi.com.br/api/cnpj/v1";

/** URL upstream para um CNPJ de 14 dígitos (sem máscara). */
export function brasilApiCnpjUrl(cnpj14: string): string {
  return `${BRASIL_API_CNPJ_V1}/${cnpj14}`;
}

type BrasilApiCnpjRow = {
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string;
};

function trimPart(s: string | undefined): string {
  return (s ?? "").trim();
}

/** Monta uma linha de endereço legível a partir dos campos da Receita/BrasilAPI. */
export function formatEnderecoFromBrasilApiParts(row: BrasilApiCnpjRow): string {
  const log = trimPart(row.logradouro);
  const num = trimPart(row.numero);
  const comp = trimPart(row.complemento);
  const bairro = trimPart(row.bairro);
  const mun = trimPart(row.municipio);
  const uf = trimPart(row.uf);
  const cepRaw = digitsOnly(trimPart(row.cep), 8);
  const cep =
    cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : trimPart(row.cep);

  const first = [log, num].filter(Boolean).join(", ");
  const withComp = comp ? `${first}${first ? " — " : ""}${comp}` : first;
  const cityLine = [bairro, mun && uf ? `${mun}/${uf}` : mun || uf].filter(Boolean).join(", ");
  const parts = [withComp, cityLine, cep ? `CEP ${cep}` : ""].filter(Boolean);
  return parts.join(" — ");
}

function pickTelefoneDigits(row: BrasilApiCnpjRow): string {
  const a = digitsOnly(trimPart(row.ddd_telefone_1), 11);
  if (a.length >= 10) return a;
  const b = digitsOnly(trimPart(row.ddd_telefone_2), 11);
  return b.length >= 10 ? b : a || b;
}

/**
 * Converte o JSON da BrasilAPI (`/api/cnpj/v1/{cnpj}`) no DTO usado pelos formulários.
 * Retorna `null` se o payload não for um objeto com razão social minimamente válida.
 */
export function mapBrasilApiCnpjJsonToDto(raw: unknown): CnpjLookupDto | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as BrasilApiCnpjRow;
  const razaoSocial = trimPart(row.razao_social);
  if (!razaoSocial) return null;

  const nomeFantasia = trimPart(row.nome_fantasia);
  const endereco = formatEnderecoFromBrasilApiParts(row);
  const telefoneDigits = pickTelefoneDigits(row);
  const email = trimPart(row.email);

  return {
    razaoSocial,
    nomeFantasia,
    endereco,
    telefoneDigits,
    email,
  };
}
