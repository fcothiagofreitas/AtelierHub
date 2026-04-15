import { z } from "zod";
import { emptyToUndefined } from "@/lib/form-utils";

const variacaoRowSchema = z.object({
  id: z.string().optional(),
  opcaoTamanhoId: z.string().trim().min(1, "Selecione o tamanho."),
  corCatalogoId: z.string().trim().min(1, "Selecione a cor."),
  ean13: z.string().optional(),
  codigoExterno: z.string().optional(),
  ordem: z.coerce.number().int().min(0).default(0),
});

export const produtoFormSchema = z
  .object({
    id: z.string().optional(),
    referencia: z.string().optional(),
    nome: z.string().trim().min(1, "Informe o nome do produto."),
    descricao: z.string().optional(),
    categoriaId: z.string().optional(),
    subcategoriaId: z.string().optional(),
    tipoId: z.string().optional(),
    colecaoId: z.string().optional(),
    gradeTamanhoId: z.string().optional(),
    isActive: z.boolean().default(true),
    precoVenda: z.string().optional(),
    ncm: z.string().optional(),
    cest: z.string().optional(),
    origemMercadoria: z.string().optional(),
    unidadeTributavel: z.string().optional(),
    variacoes: z.array(variacaoRowSchema).min(1, "Inclua ao menos uma variação."),
  })
  .superRefine((data, ctx) => {
    const ncm = emptyToUndefined(data.ncm?.replace(/\D/g, ""));
    if (ncm != null && ncm.length !== 8) {
      ctx.addIssue({ code: "custom", message: "NCM deve ter 8 dígitos.", path: ["ncm"] });
    }
    const cest = emptyToUndefined(data.cest?.replace(/\D/g, ""));
    if (cest != null && cest.length !== 7) {
      ctx.addIssue({ code: "custom", message: "CEST deve ter 7 dígitos.", path: ["cest"] });
    }
    const orig = emptyToUndefined(data.origemMercadoria?.trim());
    if (orig != null) {
      const n = Number(orig);
      if (!Number.isInteger(n) || n < 0 || n > 8) {
        ctx.addIssue({
          code: "custom",
          message: "Origem da mercadoria deve ser um número de 0 a 8.",
          path: ["origemMercadoria"],
        });
      }
    }

    const grade = emptyToUndefined(data.gradeTamanhoId);
    if (data.variacoes.length > 0 && !grade) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a grade de tamanhos usada neste produto.",
        path: ["gradeTamanhoId"],
      });
    }

    const seen = new Set<string>();
    for (let i = 0; i < data.variacoes.length; i++) {
      const v = data.variacoes[i]!;
      const k = `${v.opcaoTamanhoId}|${v.corCatalogoId}`;
      if (seen.has(k)) {
        ctx.addIssue({
          code: "custom",
          message: "Não repita a mesma combinação de tamanho e cor.",
          path: ["variacoes"],
        });
        return;
      }
      seen.add(k);
    }
  });

export type ProdutoFormInput = z.infer<typeof produtoFormSchema>;
