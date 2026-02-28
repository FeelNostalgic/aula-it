import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { DashboardPage } from "./dashboard-page";
import { cleanupTestUsers, generateTestEmail, getSupabaseAdmin } from "../helpers";

test.afterAll(async () => {
    await cleanupTestUsers();
});

test.describe("Teacher Dashboard", () => {
    test("debe permitir a un profesor crear un módulo", async ({ page }) => {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.warn("Skipping teacher test: SUPABASE_SERVICE_ROLE_KEY not set");
            return;
        }

        const testEmail = generateTestEmail("teacher");
        const password = "password123";

        // 1. Crear usuario con rol profesor usando Admin API
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: "Test Teacher",
                role: "teacher"
            }
        });

        if (createError || !user) throw new Error(`Could not create teacher: ${createError?.message}`);

        // En la nueva arquitectura de seguridad (profiles), necesitamos asegurar que el perfil tenga el rol
        // El trigger ya debería haberlo creado con el rol del metadata, pero vamos a asegurarnos
        // para que el test sea robusto ante delays de triggers (aunque son inmediatos en transacciones)
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // 2. Login y Flow
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);

        await loginPage.login(testEmail, password);
        await dashboardPage.verifyUrl(/\/dashboard/);
        await dashboardPage.verifyDashboardRole("Módulos que impartes");

        // 3. Crear módulo
        await dashboardPage.createModule("Playwright POM Module", "Created by refactored E2E Test");

        // 4. Verificar
        await dashboardPage.verifyModuleExists("Playwright POM Module");
    });
});
