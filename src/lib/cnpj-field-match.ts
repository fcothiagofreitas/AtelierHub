import type { CnpjLookupDto } from "@/lib/cnpj-lookup";
import { digitsOnly } from "@/lib/masks-br";

/** Comparação tolerante a espaços e maiúsculas. */
export function normText(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export type ClientePjFieldsForCnpjMatch = {
  razaoSocial: string;
  fantasia: string;
  endereco: string;
  telefoneDigits: string;
  email: string;
};

/**
 * Lista rótulos de campos preenchidos pelo usuário que divergem do retorno da API.
 * Campos vazios no formulário não geram divergência.
 */
export function clientePjFieldLabelsDivergingFromApi(
  local: ClientePjFieldsForCnpjMatch,
  api: CnpjLookupDto,
): string[] {
  const out: string[] = [];
  const apiFantasiaDisplay = (api.nomeFantasia || api.razaoSocial).trim();

  if (local.razaoSocial.trim() && normText(local.razaoSocial) !== normText(api.razaoSocial)) {
    out.push("Razão social");
  }
  if (local.fantasia.trim() && normText(local.fantasia) !== normText(apiFantasiaDisplay)) {
    out.push("Nome fantasia");
  }
  if (local.endereco.trim() && normText(local.endereco) !== normText(api.endereco)) {
    out.push("Endereço");
  }
  const locTel = digitsOnly(local.telefoneDigits, 11);
  const apiTel = digitsOnly(api.telefoneDigits, 11);
  if (locTel.length >= 8 && apiTel.length >= 8 && locTel !== apiTel) {
    out.push("Telefone");
  }
  if (locTel.length >= 8 && apiTel.length === 0) {
    out.push("Telefone");
  }
  if (local.email.trim() && api.email.trim() && normText(local.email) !== normText(api.email)) {
    out.push("E-mail");
  }
  return out;
}

export function corretorFieldLabelsDivergingFromApi(
  local: { name: string; phoneDigits: string },
  api: CnpjLookupDto,
): string[] {
  const out: string[] = [];
  const apiName = (api.razaoSocial || api.nomeFantasia).trim();
  if (local.name.trim() && normText(local.name) !== normText(apiName)) {
    out.push("Nome");
  }
  const locTel = digitsOnly(local.phoneDigits, 11);
  const apiTel = digitsOnly(api.telefoneDigits, 11);
  if (locTel.length >= 8 && apiTel.length >= 8 && locTel !== apiTel) {
    out.push("Telefone");
  }
  if (locTel.length >= 8 && apiTel.length === 0) {
    out.push("Telefone");
  }
  return out;
}
