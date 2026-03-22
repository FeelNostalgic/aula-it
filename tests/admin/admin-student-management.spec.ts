import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { AdminStudentManagementPage } from "./admin-student-management-page";
import { getSupabaseAdmin, generateTestEmail } from "../helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let adminEmail: string;
let adminId: string;
let createdStudentPrefix: string;
const password = "password123";

test.describe("Admin Student Management (/admin/students)", () => {
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        adminEmail = generateTestEmail("admin-students");
        createdStudentPrefix = "E2EADMIN" + Date.now().toString().slice(-4);

        const { data: adminUser, error } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Admin Students", role: "admin" },
        });
        if (error) throw new Error(`Admin creation failed: ${error.message}`);
        adminId = adminUser.user.id;
        await supabase.from("profiles").update({ role: "admin" }).eq("id", adminId);
    });

    test.afterAll(async () => {
        if (!supabase) return;

        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const testStudents = (users || []).filter((u: any) =>
            u.email?.startsWith(createdStudentPrefix.toLowerCase() + "-") &&
            u.email?.endsWith("@aula.local")
        );
        for (const student of testStudents) {
            await supabase.auth.admin.deleteUser(student.id);
        }

        if (adminId) await supabase.auth.admin.deleteUser(adminId);
    });

    test("admin can create students in bulk with valid prefix", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(adminEmail, password);
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.goto();
        await adminPage.openCreateTab();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        await adminPage.fillCreateForm(createdStudentPrefix, 2, "testpass123");
        await adminPage.submitCreateForm();

        // Success: no error message, results appear
        await page.waitForTimeout(3000);
        const errorMsg = page.locator('p.text-destructive').first();
        await expect(errorMsg).not.toBeVisible({ timeout: 3000 });
    });

    test("shows validation error for invalid prefix (special chars)", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(adminEmail, password);
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.goto();
        await adminPage.openCreateTab();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        await adminPage.fillCreateForm("INVAL@ID", 2, "testpass123");
        await adminPage.submitCreateForm();

        await expect(page.locator('p').filter({ hasText: /prefijo|letras|n.meros/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test("shows validation error for count exceeding 60", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(adminEmail, password);
        await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.goto();
        await adminPage.openCreateTab();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        // Remove HTML5 max constraint so the server action runs and returns the validation error
        await page.locator('input#count').evaluate((el) => el.removeAttribute('max'));
        await adminPage.fillCreateForm("VALID", 61, "testpass123");
        await adminPage.submitCreateForm();

        await expect(page.locator('p').filter({ hasText: /n.mero.*alumnos|entre.*60/i }).first()).toBeVisible({ timeout: 8000 });
    });
});
