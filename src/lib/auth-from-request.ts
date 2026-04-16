import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";

/**
 * Parse simples do header Cookie (primeiro `=` por par).
 */
function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

/**
 * Cookie `Secure` alinhado ao login: atrás de nginx com TLS, o browser usa HTTPS mas
 * `NEXTAUTH_URL` pode ser `http://`; `x-forwarded-proto` indica o protocolo real.
 */
function secureCookieForRequest(request: Request): boolean {
  const explicit = process.env.COOKIE_SECURE;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto === "https") return true;
  if (proto === "http") return false;
  return (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
}

/**
 * Sessão para Route Handlers (`app/api/...`) a partir do `Request`.
 * Mais fiável que `getServerSession(authOptions)` sozinho atrás de proxy ou com cookies Secure.
 */
export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  const secret =
    process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const secureCookie = secureCookieForRequest(request);

  const token = await getToken({
    req: {
      headers: Object.fromEntries(request.headers.entries()),
      cookies,
    } as Parameters<typeof getToken>[0]["req"],
    secret,
    secureCookie,
  });

  if (!token?.tenantId || !token.role) return null;

  const storeIds = Array.isArray(token.storeIds)
    ? (token.storeIds as string[])
    : [];

  const expMs =
    typeof token.exp === "number" ? token.exp * 1000 : Date.now() + 86_400_000;
  return {
    expires: new Date(expMs).toISOString(),
    user: {
      id: (token.sub ?? token.id) as string,
      colaboradorId: token.colaboradorId as string,
      name: null,
      email: null,
      tenantId: token.tenantId as string,
      role: token.role as UserRole,
      storeIds,
      defaultStoreId: (token.defaultStoreId as string | null) ?? null,
    },
  };
}
