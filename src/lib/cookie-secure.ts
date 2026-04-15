/**
 * Flag `Secure` em cookies: em HTTPS o browser grava; em HTTP (ex.: IP da VPS sem TLS) com
 * `Secure: true` o cookie é ignorado — quebra loja activa e NextAuth em alguns fluxos.
 *
 * - `COOKIE_SECURE=true`  → sempre Secure
 * - `COOKIE_SECURE=false` → nunca Secure
 * - omitido → Secure só se `NEXTAUTH_URL` começar por `https://`
 */
export function cookieSecureForApp(): boolean {
  const explicit = process.env.COOKIE_SECURE;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
}
