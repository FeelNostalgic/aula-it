import { test, expect } from "@playwright/test";
import { LoginPage } from "./login-page";
import { cleanupTestUsers, generateTestEmail } from "../helpers";

test.afterAll(async () => {
    await cleanupTestUsers();
});

test.describe("Authentication", () => {
    test("debe mostrar la página de login", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto("/login");
        await expect(page.locator("h1")).toContainText("Aula IT");
    });

    test("debe permitir ingresar credenciales", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto("/login");
        await loginPage.emailInput.fill("test@example.com");
        await loginPage.passwordInput.fill("password123");
        await expect(loginPage.loginButton).toBeVisible();
    });

    test("debe redirigir al login si no hay sesión en el dashboard", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto("/dashboard");
        await loginPage.verifyUrl(/\/login/);
    });

    test("debe permitir registrar un nuevo usuario", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const testEmail = generateTestEmail("student");

        await loginPage.register("Test Student", testEmail, "password123");

        await loginPage.verifyUrl(/\/dashboard/);
        await expect(page.locator("h2")).toContainText("Módulos Activos");
    });
});
