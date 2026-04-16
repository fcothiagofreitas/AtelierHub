import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf } from "@/lib/doc-validation";

describe("isValidCpf", () => {
  it("aceita CPF com dígitos verificadores corretos", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita sequência uniforme", () => {
    expect(isValidCpf("11111111111")).toBe(false);
  });

  it("rejeita dígitos verificadores incorretos", () => {
    expect(isValidCpf("38923998321")).toBe(false);
  });

  it("rejeita tamanho diferente de 11", () => {
    expect(isValidCpf("1234567890")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ com dígitos verificadores corretos", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejeita sequência uniforme", () => {
    expect(isValidCnpj("11111111111111")).toBe(false);
  });

  it("rejeita tamanho diferente de 14", () => {
    expect(isValidCnpj("1122233300018")).toBe(false);
  });
});
