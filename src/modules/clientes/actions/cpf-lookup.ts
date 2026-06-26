"use server";

export type CpfLookupResult =
  | { nome: string; fonte: "pix" }
  | { error: string; notFound?: boolean };

export async function buscarNomePorCpf(cpf: string): Promise<CpfLookupResult> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return { error: "Lookup de CPF não configurado." };

  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return { error: "CPF inválido." };

  const baseUrl =
    process.env.ASAAS_API_URL?.replace(/\/$/, "") ?? "https://api.asaas.com";

  try {
    const url = `${baseUrl}/v3/pix/addressKeys/external?type=CPF&key=${digits}`;
    console.log("[cpf-lookup] url:", url);
    const res = await fetch(url, {
      headers: { access_token: apiKey },
      next: { revalidate: 0 },
    });

    console.log("[cpf-lookup] status:", res.status);
    if (res.status === 404) return { error: "CPF sem chave Pix cadastrada.", notFound: true };
    if (!res.ok) {
      const body = await res.text();
      console.log("[cpf-lookup] error body:", body);
      return { error: `Erro ao consultar CPF (${res.status}).` };
    }

    const data = await res.json();
    console.log("[cpf-lookup] data:", JSON.stringify(data));
    const nome: string | undefined = data?.owner?.name;
    if (!nome?.trim()) return { error: "Nome não retornado pela API." };

    return { nome: nome.trim(), fonte: "pix" };
  } catch (err) {
    console.log("[cpf-lookup] exception:", err);
    return { error: "Falha na conexão com a API de CPF." };
  }
}
