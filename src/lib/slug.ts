/** Gera slug estável em minúsculas (PT), sem acentos. */
export function slugifyPt(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "item";
}
