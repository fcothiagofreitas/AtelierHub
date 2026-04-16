import { describe, expect, it } from "vitest";
import { clientePfSchema, clientePjSchema } from "@/modules/clientes/schemas/cliente-schemas";

describe("clientePfSchema", () => {
  it("aceita CPF e telefone com pontuação (preprocess)", () => {
    const r = clientePfSchema.safeParse({
      storeId: "loja-1",
      nome: "Cliente Teste",
      cpf: "529.982.247-25",
      endereco: "Rua Exemplo, 100",
      telefone: "(11) 98765-4321",
      email: "",
      aniversario: "",
      creditLimitConsignado: "",
      corretorId: "",
      isActive: true,
      isBlocked: false,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cpf).toBe("52998224725");
      expect(r.data.telefone).toBe("11987654321");
    }
  });
});

describe("clientePjSchema", () => {
  it("aceita CNPJ e telefones com pontuação", () => {
    const r = clientePjSchema.safeParse({
      storeId: "loja-1",
      fantasia: "Loja X",
      razaoSocial: "Loja X LTDA",
      cnpj: "11.222.333/0001-81",
      ie: "123456789",
      ieIsento: false,
      endereco: "Av. Brasil, 1",
      telefone: "(11) 3333-4444",
      email: "",
      responsavelNome: "Fulano",
      responsavelFone: "(11) 98888-7777",
      creditLimitConsignado: "",
      corretorId: "",
      isActive: true,
      isBlocked: false,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cnpj).toBe("11222333000181");
      expect(r.data.telefone).toBe("1133334444");
      expect(r.data.responsavelFone).toBe("11988887777");
    }
  });
});
