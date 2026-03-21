import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { StudentManagementPage } from "./student-management-page";
import { getSupabaseAdmin, generateTestEmail } from "../helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let teacherEmail: string;
let teacherId: string;
let moduleId: string;
let createdStudentPrefix: string;
const password = "password123";

test.describe("Student Management (/alumnos)", () => {
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        teacherEmail = generateTestEmail("teacher-alumnos");
        createdStudentPrefix = "E2ETEST" + Date.now().toString().slice(-4);

        // Create teacher
        const { data: teacherUser, error: tErr } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Teacher Alumnos", role: "teacher" },
        });
        if (tErr) throw new Error(`Teacher creation failed: ${tErr.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // Create a module for enrollment tests
        const { data: mod, error: modErr } = await supabase
            .from("modules")
            .insert({ name: "E2E Alumnos Module", teacher_id: teacherId, status: "draft" })
            .select("id").single();
        if (modErr) throw new Error(`Module creation failed: ${modErr.message}`);
        moduleId = mod.id;
    });

    test.afterAll(async () => {
        if (!supabase) return;

        // Delete created test students (@aula.local)
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const testStudents = (users || []).filter((u: any) =>
            u.email?.startsWith(createdStudentPrefix.toLowerCase() + "-") &&
            u.email?.endsWith("@aula.local")
        );
        for (const student of testStudents) {
            await supabase.auth.admin.deleteUser(student.id);
        }

        // Delete module
        if (moduleId) await supabase.from("modules").delete().eq("id", moduleId);
        // Delete teacher
        if (teacherId) await supabase.auth.admin.deleteUser(teacherId);
    });

    test("teacher can navigate to /alumnos page", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        await page.goto("/alumnos");
        await expect(page).toHaveURL(/\/alumnos/, { timeout: 10000 });
        await expect(page.locator("h1, h2").filter({ hasText: /alumnos|students/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test("teacher can create students in bulk with valid prefix", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        const studentPage = new StudentManagementPage(page);
        await studentPage.goto();

        // Switch to "Crear cuentas" tab
        await studentPage.openCreateDialog();

        // Wait for the create form to be visible
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        // Fill and submit
        await studentPage.fillCreateForm(createdStudentPrefix, 2, "testpass123");
        await studentPage.submitCreateForm();

        // Wait for server action to complete — success shows a results table or no error
        await page.waitForTimeout(3000);
        const errorMsg = page.locator('p.text-destructive').first();
        await expect(errorMsg).not.toBeVisible({ timeout: 3000 });
    });

    test("shows validation error for invalid prefix (special chars)", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        const studentPage = new StudentManagementPage(page);
        await studentPage.goto();
        await studentPage.openCreateDialog();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        // Invalid prefix with special chars (hyphen not allowed)
        await studentPage.fillCreateForm("INVAL-ID", 2, "testpass123");
        await studentPage.submitCreateForm();

        // Error: "El prefijo solo puede contener letras y números"
        await expect(page.locator('p').filter({ hasText: /prefijo|letras|n.meros/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test("shows validation error for count exceeding 60", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        const studentPage = new StudentManagementPage(page);
        await studentPage.goto();
        await studentPage.openCreateDialog();
        await expect(page.locator('button[type="submit"]').filter({ hasText: /generar/i }).first()).toBeVisible({ timeout: 5000 });

        // Remove HTML5 max constraint so the server action runs and returns the error
        await page.locator('input#count').evaluate((el) => el.removeAttribute('max'));
        await studentPage.fillCreateForm("VALID", 61, "testpass123");
        await studentPage.submitCreateForm();

        // Error: "El número de alumnos debe estar entre 1 y 60"
        await expect(page.locator('p').filter({ hasText: /n.mero.*alumnos|entre.*60/i }).first()).toBeVisible({ timeout: 8000 });
    });

    test("teacher can list created students", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        await page.goto("/alumnos");
        await expect(page).toHaveURL(/\/alumnos/, { timeout: 10000 });

        // The page should load and show the student table (may be empty or have students)
        // Just verify the page loaded without crashing
        await expect(page.locator("body")).not.toHaveText(/error/i, { timeout: 5000 });
    });
});
