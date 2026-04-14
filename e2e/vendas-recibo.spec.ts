import { test, expect } from "@playwright/test";

test.describe("Vendas — recibo PDF (Sprint 10)", () => {
  test("link do recibo no PDV (pedido quitado com pagamento)", async ({
    page,
    baseURL,
  }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("vendedor@demo.com");
    await page.getByLabel("Senha").fill("vendedor123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto("/vendas?busca=3");
    await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();

    /** `<tr role="link">` expõe o papel `link`, não `row`. */
    await page.getByRole("link", { name: /Abrir pedido nº 3/ }).click();

    /** Pedido quitado abre o painel `pagamento=1` (resumo); o recibo fica neste test id. */
    const recibo = page.getByTestId("vendas-recibo-pdf-finalizada");
    await expect(recibo).toBeVisible({ timeout: 30_000 });
    await expect(recibo).toHaveAttribute(
      "href",
      /\/api\/vendas\/pedido\/[^/]+\/recibo$/,
    );

    const href = await recibo.getAttribute("href");
    expect(href).toBeTruthy();

    const res = await page.request.get(new URL(href!, baseURL).toString());
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("pdf");
  });
});
