import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { DashboardPage } from "./dashboard-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

let teacherEmail: string;
let teacherUserId: string;

test.describe("Teacher Dashboard", () => {
    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !teacherUserId) return;
        await supabase.from("modules").delete().eq("teacher_id", teacherUserId);
        await supabase.auth.admin.deleteUser(teacherUserId);
    });

    test("debe permitir a un profesor crear un módulo", async ({ page }) => {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.warn("Skipping teacher test: SUPABASE_SERVICE_ROLE_KEY not set");
            return;
        }

        teacherEmail = generateTestEmail("teacher");
        const password = "password123";

        // 1. Crear usuario con rol profesor usando Admin API
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: "Test Teacher",
                role: "teacher"
            }
        });

        if (createError || !user) throw new Error(`Could not create teacher: ${createError?.message}`);
        teacherUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // 2. Login y Flow
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);

        await loginPage.login(teacherEmail, password);
        await dashboardPage.verifyUrl(/\/dashboard/);
        await dashboardPage.verifyDashboardRole("Gestión de Módulos");

        // 3. Crear módulo
        await dashboardPage.createModule("Playwright POM Module", "Created by refactored E2E Test");

        // 4. Verificar
        await dashboardPage.verifyModuleExists("Playwright POM Module");
    });
});
