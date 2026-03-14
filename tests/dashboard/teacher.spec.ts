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

        // upsert ensures the profile row exists with teacher role regardless of trigger timing
        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({ id: user.id, role: "teacher", full_name: "Test Teacher" });
        if (profileError) throw new Error(`Could not set teacher role: ${profileError.message}`);

        // 2. Login y Flow
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);

        await loginPage.login(teacherEmail, password);
        await dashboardPage.verifyUrl(/\/dashboard/);
        await dashboardPage.verifyDashboardRole("Gestión de Módulos");

        // 3. Crear módulo
        await dashboardPage.createModule("Playwright POM Module", "Description for Playwright Module");

        // Wait for the dialog to close (resetForm is called after success)
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).not.toBeVisible({ timeout: 15000 });

        // Verify success toast appears - more flexible regex and longer wait for refresh
        await expect(page.getByText(/creado correctamente|éxito|success/i)).toBeVisible({ timeout: 15000 });

        // Wait a bit for the UI to stabilize after refresh before checking existence
        await page.waitForTimeout(1000);

        // 4. Verificar
        await dashboardPage.verifyModuleExists("Playwright POM Module");
    });
});

// ─── Error Path Tests ─────────────────────────────────────────────────────────

let errorTeacherId: string;
let errorTeacherEmail: string;

test.describe("Teacher Dashboard - Error Paths", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        errorTeacherEmail = generateTestEmail("teacher-err");
        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: errorTeacherEmail,
            password: "password123",
            email_confirm: true,
            user_metadata: { full_name: "Error Test Teacher", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        errorTeacherId = user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !errorTeacherId) return;
        await supabase.auth.admin.deleteUser(errorTeacherId);
    });

    test("no debe crear módulo con nombre vacío", { tag: ["@e2e", "@dashboard", "@high", "@TCH-E2E-ERR-001"] }, async ({ page }) => {
        const supabase = getSupabaseAdmin();
        if (!supabase) { test.skip(true, "Skipping: SUPABASE_SERVICE_ROLE_KEY not set"); return; }

        const loginPage = new LoginPage(page);
        await loginPage.login(errorTeacherEmail, "password123");
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.verifyDashboardRole("Gestión de Módulos");

        // Open the create module dialog
        await dashboardPage.createNewModuleButton.click();
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Submit without filling the name (leave it empty)
        await dialog.locator('textarea[name="description"]').fill("Some description");
        
        // Verify the button is disabled because 'name' is empty
        const submitBtn = dialog.locator('button:has-text("CREAR MÓDULO")');
        await expect(submitBtn).toBeDisabled();

        // Dialog must remain open
        await expect(dialog).toBeVisible();
    });
});
