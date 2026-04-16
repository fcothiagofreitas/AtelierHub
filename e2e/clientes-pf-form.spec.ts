import { test, expect } from "@playwright/test";

test.describe("Clientes — formulário PF", () => {
  test("erro de CPF inválido mantém os campos preenchidos", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("vendedor@demo.com");
    await page.getByLabel("Senha").fill("vendedor123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/clientes/new/pf");
    await expect(page.getByRole("heading", { name: /Nova pessoa física/i })).toBeVisible({
      timeout: 15_000,
    });

    const nome = `E2E persistência ${Date.now()}`;
    await page.locator("#nome").fill(nome);
    await page.locator("#cpf").fill("38923998321");
    await page.locator("#endereco").fill("Rua Teste, 100");
    await page.locator("#telefone").fill("11987654321");

    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText(/CPF inválido/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#nome")).toHaveValue(nome);
    await expect(page.locator("#endereco")).toHaveValue("Rua Teste, 100");
  });

  test("CPF válido e dados mínimos — salva e vai para lista", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("vendedor@demo.com");
    await page.getByLabel("Senha").fill("vendedor123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/clientes/new/pf");
    await expect(page.getByRole("heading", { name: /Nova pessoa física/i })).toBeVisible({
      timeout: 15_000,
    });

    const nome = `E2E OK ${Date.now()}`;
    await page.locator("#nome").fill(nome);
    await page.locator("#cpf").fill("52998224725");
    await page.locator("#endereco").fill("Rua Válida, 200");
    await page.locator("#telefone").fill("1133334444");

    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page).toHaveURL(/\/clientes$/, { timeout: 30_000 });
  });
});
