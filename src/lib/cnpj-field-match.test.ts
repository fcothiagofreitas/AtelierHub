import { describe, expect, it } from "vitest";
import {
  clientePjFieldLabelsDivergingFromApi,
  corretorFieldLabelsDivergingFromApi,
  normText,
} from "@/lib/cnpj-field-match";
import type { CnpjLookupDto } from "@/lib/cnpj-lookup";

const api: CnpjLookupDto = {
  razaoSocial: "ACME LTDA",
  nomeFantasia: "ACME",
  endereco: "Rua A, 1 — Centro, São Paulo/SP — CEP 01000-000",
  telefoneDigits: "11999998888",
  email: "a@acme.com",
};

describe("normText", () => {
  it("colapsa espaços e minúsculas", () => {
    expect(normText("  Foo   Bar  ")).toBe("foo bar");
  });
});

describe("clientePjFieldLabelsDivergingFromApi", () => {
  it("vazio no formulário não diverge", () => {
    expect(
      clientePjFieldLabelsDivergingFromApi(
        {
          razaoSocial: "",
          fantasia: "",
          endereco: "",
          telefoneDigits: "",
          email: "",
        },
        api,
      ),
    ).toEqual([]);
  });

  it("detecta razão e telefone diferentes", () => {
    const labels = clientePjFieldLabelsDivergingFromApi(
      {
        razaoSocial: "OUTRA LTDA",
        fantasia: "ACME",
        endereco: api.endereco,
        telefoneDigits: "11888887777",
        email: "",
      },
      api,
    );
    expect(labels).toContain("Razão social");
    expect(labels).toContain("Telefone");
    expect(labels).not.toContain("Nome fantasia");
  });
});

describe("corretorFieldLabelsDivergingFromApi", () => {
  it("nome igual não diverge", () => {
    expect(
      corretorFieldLabelsDivergingFromApi(
        { name: "acme ltda", phoneDigits: "11999998888" },
        api,
      ),
    ).toEqual([]);
  });

  it("nome diferente diverge", () => {
    expect(corretorFieldLabelsDivergingFromApi({ name: "X", phoneDigits: "" }, api)).toEqual([
      "Nome",
    ]);
  });
});
