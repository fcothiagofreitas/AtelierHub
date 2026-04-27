import { describe, expect, it } from "vitest";
import { formatDateBr } from "@/lib/format-date-br";

describe("formatDateBr", () => {
  it("formata Date em dd/MM/aaaa", () => {
    expect(formatDateBr(new Date(2026, 3, 24))).toBe("24/04/2026");
  });

  it("aceita ISO string (data calendário local)", () => {
    expect(formatDateBr(new Date(2026, 0, 5, 12, 0, 0))).toBe("05/01/2026");
  });

  it("retorna traço para null/inválido", () => {
    expect(formatDateBr(null)).toBe("—");
    expect(formatDateBr(undefined)).toBe("—");
    expect(formatDateBr("")).toBe("—");
  });
});
