import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { generateTestEmail, getSupabaseAdmin } from "./helpers";

test.describe.configure({ mode: "serial" });

let teacherModuleId: string;
let testEmail: string;
let testUserId: string;
const password = "password123";

test.describe("Module Details Tabs", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("mod-tabs");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Tabs Teacher", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "Redes Locales Tabs E2E", description: "Test module", icon: "Network", teacher_id: user.id })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        teacherModuleId = mod.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        await supabase.from("module_enrollments").delete().eq("module_id", teacherModuleId);
        await supabase.from("modules").delete().eq("teacher_id", testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test.beforeEach(async ({ page }) => {
        if (!testUserId) { test.skip(); return; }

        const loginPage = new LoginPage(page);
        await loginPage.login(testEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        const moduleCard = page.locator(`h3:has-text("Redes Locales Tabs E2E")`).first();
        await expect(moduleCard).toBeVisible({ timeout: 10000 });
        await moduleCard.click();
        await page.waitForURL(/\/dashboard\/modules\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");
    });

    test("students tab displays list and opens enroll modal", async ({ page }) => {
        // Click the ALUMNOS tab
        await page.getByRole('tab', { name: 'ALUMNOS' }).click();

        // Verify the filters and empty state
        await expect(page.getByRole('button', { name: 'Todos los Estados' })).toBeVisible();
        await expect(page.getByText('No hay alumnos matriculados en este módulo.')).toBeVisible();

        // Click adding students button
        await page.getByRole('button', { name: 'Añadir alumnos', exact: true }).click();

        // Verify the dialog
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Añadir Alumnos' })).toBeVisible();

        // Search mechanism
        const searchInput = page.getByPlaceholder('Buscar por nombre, email o ID...');
        await searchInput.fill('Ana');

        // Wait for search debounce natively or through visual queue (spin goes away)
        // Since Search doesn't have a dedicated button but reacts to input:
        await page.waitForTimeout(1000); // give debounce time

        const noResults = page.getByText('No se encontraron alumnos');
        const anaResult = page.getByText('Ana').first();
        await expect(noResults.or(anaResult)).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    });

    test("settings tab allows form interaction", async ({ page }) => {
        // Click the CONFIGURACIÓN tab
        await page.getByRole('tab', { name: 'CONFIGURACIÓN' }).click();

        await expect(page.getByRole('heading', { name: 'Información General' })).toBeVisible();
        await expect(page.getByText('Nombre del módulo')).toBeVisible();

        await expect(page.getByText('Público', { exact: true })).toBeVisible();
        await expect(page.getByText('Privado', { exact: true })).toBeVisible();

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toHaveValue("Redes Locales Tabs E2E");

        await nameInput.fill("Redes Locales Tabs E2E (Editado)");
        const submitBtn = page.getByRole('button', { name: 'Guardar cambios' });

        await submitBtn.click();
        // Since it's a form action, wait for some response (in this test, we just check button state if needed)
    });
});
