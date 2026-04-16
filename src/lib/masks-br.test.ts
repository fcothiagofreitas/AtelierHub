import { describe, expect, it } from "vitest";
import {
  digitsOnly,
  formatCnpjDisplay,
  formatCpfDisplay,
  formatTelefoneBrDisplay,
} from "@/lib/masks-br";

describe("digitsOnly", () => {
  it("remove não dígitos e limita", () => {
    expect(digitsOnly("a1b2c3", 3)).toBe("123");
  });
});

describe("formatCpfDisplay", () => {
  it("formata CPF completo", () => {
    expect(formatCpfDisplay("52998224725")).toBe("529.982.247-25");
  });

  it("aceita entrada já mascarada", () => {
    expect(formatCpfDisplay("529.982.247-25")).toBe("529.982.247-25");
  });
});

describe("formatCnpjDisplay", () => {
  it("formata CNPJ completo", () => {
    expect(formatCnpjDisplay("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("formatTelefoneBrDisplay", () => {
  it("formata fixo 10 dígitos", () => {
    expect(formatTelefoneBrDisplay("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata celular 11 dígitos", () => {
    expect(formatTelefoneBrDisplay("11987654321")).toBe("(11) 98765-4321");
  });
});
