import { test, expect } from "@playwright/test";
import { LoginPage } from "./login-page";
import { cleanupTestUsers, generateTestEmail, getSupabaseAdmin } from "../helpers";

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

    test("debe mostrar error con credenciales incorrectas", { tag: ["@e2e", "@auth", "@critical", "@AUTH-E2E-ERR-001"] }, async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login("nonexistent-user@aula-it.dev", "wrongpassword999");

        // Error appears inline — not a toast
        const errorEl = page.locator(".text-destructive");
        await expect(errorEl).toBeVisible({ timeout: 5000 });

        // Must stay on login page
        await loginPage.verifyUrl(/\/login/);
    });

    test("debe mostrar error al registrar con contraseña demasiado corta", { tag: ["@e2e", "@auth", "@critical", "@AUTH-E2E-ERR-002"] }, async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.register("Test User", generateTestEmail("short-pass"), "ab");

        // Error appears inline
        const errorEl = page.locator(".text-destructive");
        await expect(errorEl).toBeVisible({ timeout: 5000 });

        // Must stay on register page
        await loginPage.verifyUrl(/\/register/);
    });

    test("debe mostrar error al registrar con email ya existente", { tag: ["@e2e", "@auth", "@high", "@AUTH-E2E-ERR-003"] }, async ({ page }) => {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            test.skip(true, "Skipping: SUPABASE_SERVICE_ROLE_KEY not set");
            return;
        }

        const existingEmail = generateTestEmail("existing");
        await supabase.auth.admin.createUser({
            email: existingEmail,
            password: "password123",
            email_confirm: true,
        });

        const loginPage = new LoginPage(page);
        await loginPage.register("Test User", existingEmail, "password123");

        // Either stays on /register with inline error, or shows inline error
        const errorEl = page.locator(".text-destructive");
        await expect(errorEl).toBeVisible({ timeout: 5000 });
    });
});
