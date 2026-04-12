const MESSAGES: Record<string, string> = {
  id: "Operação inválida.",
  nf: "Registro não encontrado.",
  inuse: "Não é possível excluir: existem vínculos ativos.",
  db: "Não foi possível concluir a operação.",
};

type Props = {
  code?: string | string[];
};

export function CatalogoListAlert({ code }: Props) {
  const c = Array.isArray(code) ? code[0] : code;
  if (!c || !MESSAGES[c]) return null;
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {MESSAGES[c]}
    </div>
  );
}
