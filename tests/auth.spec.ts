import { test, expect } from "@playwright/test";

test("debe mostrar la página de login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h3")).toContainText("AULA IT");
});

test("debe permitir ingresar credenciales", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await expect(page.locator('button:has-text("SIGN IN")')).toBeVisible();
});

test("debe redirigir al login si no hay sesión en el dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  // Debe ser redirigido a /login por el proxy.ts
  await expect(page).toHaveURL(/\/login/);
});

test("debe permitir registrar un nuevo usuario", async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  await page.goto("/register");

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', "password123");

  await page.click('button:has-text("CREATE ACCOUNT")');

  // Como el usuario desactivó la confirmación de email, 
  // el registro debería redirigir directamente al dashboard
  await expect(page).toHaveURL(/\/dashboard/);
});
