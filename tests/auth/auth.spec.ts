import { test, expect } from "@playwright/test";
import { LoginPage } from "./login-page";
import { cleanupTestUsers } from "../helpers";

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

    test("debe mostrar error con credenciales incorrectas", { tag: ["@e2e", "@auth", "@critical", "@AUTH-E2E-ERR-001"] }, async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login("nonexistent-user@aula-it.dev", "wrongpassword999");

        // Error appears inline — not a toast
        const errorEl = page.locator(".text-destructive");
        await expect(errorEl).toBeVisible({ timeout: 5000 });

        // Must stay on login page
        await loginPage.verifyUrl(/\/login/);
    });

    test("debe mostrar página de acceso docente en /login/teacher", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.gotoTeacherLogin();
        await expect(page.locator("h1")).toContainText("Aula IT");
        await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    });

    test("debe mostrar mensaje de registro deshabilitado en /register", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto("/register");
        await expect(page.getByText(/solo por invitación/i)).toBeVisible();
        await expect(page.locator("form")).not.toBeVisible();
    });
});
