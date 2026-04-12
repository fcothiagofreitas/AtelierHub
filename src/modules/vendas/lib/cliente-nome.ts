import type { ClienteTipo } from "@prisma/client";

export function clienteNomeCurto(input: {
  tipo: ClienteTipo;
  nome: string | null;
  fantasia: string | null;
  razaoSocial: string | null;
}): string {
  if (input.tipo === "PF") return input.nome?.trim() || "—";
  return input.fantasia?.trim() || input.razaoSocial?.trim() || "—";
}
