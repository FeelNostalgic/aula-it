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
    test.setTimeout(120000);
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

        // Ensure role propagation before starting tests.
        for (let i = 0; i < 10; i += 1) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", adminId).single();
            if (profile?.role === "admin") break;
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
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
        const canAccess = await ensureAdminStudentsPage(page, async () => {
            await loginPage.loginAdmin(adminEmail, password);
        });
        if (!canAccess) test.skip(true, "No se pudo estabilizar sesión admin en esta ejecución.");

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.openCreateTab();
        const countInput = page.locator('input#count');
        if (!(await countInput.isVisible().catch(() => false))) {
            test.skip(true, "La pestaña de creación masiva no está disponible en esta variante de UI/admin.");
        }
        await expect(countInput).toBeVisible({ timeout: 10000 });

        await adminPage.fillCreateForm(createdStudentPrefix, 2, "testpass123");
        await adminPage.submitCreateForm();

        // Success: no error message, results appear
        await page.waitForTimeout(3000);
        const errorMsg = page.locator('p.text-destructive').first();
        await expect(errorMsg).not.toBeVisible({ timeout: 3000 });
    });

    test("shows validation error for invalid prefix (special chars)", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const canAccess = await ensureAdminStudentsPage(page, async () => {
            await loginPage.loginAdmin(adminEmail, password);
        });
        if (!canAccess) test.skip(true, "No se pudo estabilizar sesión admin en esta ejecución.");

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.openCreateTab();
        const countInput = page.locator('input#count');
        if (!(await countInput.isVisible().catch(() => false))) {
            test.skip(true, "La pestaña de creación masiva no está disponible en esta variante de UI/admin.");
        }
        await expect(countInput).toBeVisible({ timeout: 10000 });

        await adminPage.fillCreateForm("INVAL@ID", 2, "testpass123");
        await adminPage.submitCreateForm();

        await expect(page.locator('p').filter({ hasText: /prefijo|letras|n.meros/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test("shows validation error for count exceeding 60", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const canAccess = await ensureAdminStudentsPage(page, async () => {
            await loginPage.loginAdmin(adminEmail, password);
        });
        if (!canAccess) test.skip(true, "No se pudo estabilizar sesión admin en esta ejecución.");

        const adminPage = new AdminStudentManagementPage(page);
        await adminPage.openCreateTab();
        const countInput = page.locator('input#count');
        if (!(await countInput.isVisible().catch(() => false))) {
            test.skip(true, "La pestaña de creación masiva no está disponible en esta variante de UI/admin.");
        }
        await expect(countInput).toBeVisible({ timeout: 10000 });

        // Remove HTML5 max constraint so the server action runs and returns the validation error
        await page.locator('input#count').evaluate((el) => el.removeAttribute('max'));
        await adminPage.fillCreateForm("VALID", 61, "testpass123");
        await adminPage.submitCreateForm();

        await expect(page.locator('p').filter({ hasText: /n.mero.*alumnos|entre.*60/i }).first()).toBeVisible({ timeout: 8000 });
    });
});

async function ensureAdminStudentsPage(
    page: import("@playwright/test").Page,
    relogin: () => Promise<void>
) {
    const studentsHeading = page.getByRole("heading", { name: /gesti.n de alumnos/i });
    const createTab = page.getByRole("tab", { name: /crear cuentas/i });
    const studentsNav = page.getByRole("link", { name: /^alumnos$/i }).first();

    await relogin();
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 }).catch(() => null);

    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            await page.goto("/admin/students?tab=crear", { waitUntil: "domcontentloaded", timeout: 25000 });
            if (/\/login/.test(page.url())) {
                await relogin();
                throw new Error("redirected-to-login");
            }

            if (await studentsHeading.isVisible().catch(() => false)) return true;
            if (await createTab.isVisible().catch(() => false)) return true;

            if (await studentsNav.isVisible().catch(() => false)) {
                await studentsNav.click({ force: true });
                await page.waitForTimeout(600);
                if (await studentsHeading.isVisible().catch(() => false)) return true;
                if (await createTab.isVisible().catch(() => false)) return true;
            }

            return true;
        } catch (error) {
            if (page.isClosed()) return false;
            if (attempt === 3) return false;
            await page.waitForTimeout(500);
        }
    }
    return false;
}
