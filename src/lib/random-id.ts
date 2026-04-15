/**
 * Identificador único no cliente. `crypto.randomUUID` pode faltar em contextos não seguros
 * (ex.: site servido por http://IP, não localhost).
 */
export function clientRandomId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
