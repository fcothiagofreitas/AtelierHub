import { describe, expect, it } from "vitest";
import {
  formatEnderecoFromBrasilApiParts,
  mapBrasilApiCnpjJsonToDto,
} from "@/lib/cnpj-lookup";

const fixtureBrasilApi = {
  cnpj: "11222333000181",
  razao_social: "Empresa Teste LTDA",
  nome_fantasia: "Loja Teste",
  logradouro: "Rua das Flores",
  numero: "1000",
  complemento: "Sala 2",
  bairro: "Centro",
  municipio: "São Paulo",
  uf: "SP",
  cep: "01310100",
  ddd_telefone_1: "1133334444",
  ddd_telefone_2: "",
  email: "contato@empresa.test",
};

describe("formatEnderecoFromBrasilApiParts", () => {
  it("monta endereço com CEP formatado", () => {
    expect(formatEnderecoFromBrasilApiParts(fixtureBrasilApi)).toBe(
      "Rua das Flores, 1000 — Sala 2 — Centro, São Paulo/SP — CEP 01310-100",
    );
  });

  it("omite partes vazias", () => {
    expect(
      formatEnderecoFromBrasilApiParts({
        logradouro: "Av. Paulista",
        numero: "1",
        municipio: "São Paulo",
        uf: "SP",
      }),
    ).toBe("Av. Paulista, 1 — São Paulo/SP");
  });
});

describe("mapBrasilApiCnpjJsonToDto", () => {
  it("mapeia fixture típica da BrasilAPI", () => {
    const dto = mapBrasilApiCnpjJsonToDto(fixtureBrasilApi);
    expect(dto).toEqual({
      razaoSocial: "Empresa Teste LTDA",
      nomeFantasia: "Loja Teste",
      endereco:
        "Rua das Flores, 1000 — Sala 2 — Centro, São Paulo/SP — CEP 01310-100",
      telefoneDigits: "1133334444",
      email: "contato@empresa.test",
    });
  });

  it("usa segundo telefone se o primeiro for curto", () => {
    const dto = mapBrasilApiCnpjJsonToDto({
      razao_social: "X",
      ddd_telefone_1: "11",
      ddd_telefone_2: "21987654321",
    });
    expect(dto?.telefoneDigits).toBe("21987654321");
  });

  it("retorna null sem razao_social", () => {
    expect(mapBrasilApiCnpjJsonToDto({ nome_fantasia: "Só fantasia" })).toBeNull();
    expect(mapBrasilApiCnpjJsonToDto(null)).toBeNull();
  });
});
