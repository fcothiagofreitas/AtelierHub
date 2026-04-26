import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isValidCnpj } from "@/lib/doc-validation";
import { brasilApiCnpjUrl, mapBrasilApiCnpjJsonToDto } from "@/lib/cnpj-lookup";
import { digitsOnly } from "@/lib/masks-br";

const UPSTREAM_TIMEOUT_MS = 12_000;

type RouteParams = { params: Promise<{ cnpj: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cnpj: rawSegment } = await params;
  const cnpj14 = digitsOnly(String(rawSegment ?? ""), 14);

  if (cnpj14.length !== 14 || !isValidCnpj(cnpj14)) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let res: Response;
  try {
    // BrasilAPI (e.g. Cloudflare na frente) responde 403 sem User-Agent “real”;
    // o fetch do Node usa um UA que costuma ser bloqueado.
    res = await fetch(brasilApiCnpjUrl(cnpj14), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "atelierhub/0.1 (integração CNPJ; contato via app)",
      },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar o CNPJ. Tente de novo em instantes." },
      { status: 502 },
    );
  } finally {
    clearTimeout(t);
  }

  if (res.status === 404) {
    return NextResponse.json({ error: "CNPJ não encontrado na base pública." }, { status: 404 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Serviço de consulta temporariamente indisponível." },
      { status: 502 },
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return NextResponse.json({ error: "Resposta inválida do serviço de consulta." }, { status: 502 });
  }

  const dto = mapBrasilApiCnpjJsonToDto(body);
  if (!dto) {
    return NextResponse.json({ error: "Dados do CNPJ incompletos ou inválidos." }, { status: 502 });
  }

  return NextResponse.json(dto);
}
