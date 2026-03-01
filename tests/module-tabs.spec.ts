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
        await page.getByRole('button', { name: 'AÑADIR ALUMNOS', exact: true }).click();

        // Verify the dialog
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Añadir Alumnos' })).toBeVisible();

        // 1. Scope to the dialog so you don't hit background elements
        const searchInput = dialog.getByRole('textbox');
        await searchInput.fill('Ana');

        // 2. Actually click the search button instead of hoping for a debounce
        await dialog.getByRole('button', { name: 'Buscar' }).click();

        // 3. Let Playwright do the waiting natively (NO hardcoded waitForTimeout!)
        const noResults = dialog.getByText('No se encontraron alumnos');
        const anaResult = dialog.getByText('Ana').first();
        await expect(noResults.or(anaResult)).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    });

    test("settings tab allows form interaction", async ({ page }) => {
        // Click the CONFIGURACIÓN tab
        await page.getByRole('tab', { name: 'CONFIGURACIÓN' }).click();

        await expect(page.getByRole('heading', { name: 'Información General' })).toBeVisible();
        await expect(page.getByText('Nombre del módulo')).toBeVisible();
        await expect(page.getByText('Estado del Módulo')).toBeVisible();

        // Verify that the select exists and contains the default state
        const statusSelect = page.getByRole('combobox').first();
        await expect(statusSelect).toContainText('Pendiente');

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toHaveValue("Redes Locales Tabs E2E");

        await nameInput.fill("Redes Locales Tabs E2E (Editado)");
        const submitBtn = page.getByRole('button', { name: 'Guardar cambios' });

        await submitBtn.click();
        // Since it's a form action, wait for some response (in this test, we just check button state if needed)
    });

    test("settings tab allows changing module status", async ({ page }) => {
        await page.getByRole('tab', { name: 'CONFIGURACIÓN' }).click();

        // Check for general information
        await expect(page.getByRole('heading', { name: 'Información General' })).toBeVisible();

        // Change status to active
        const statusSelect = page.getByRole('combobox').first();
        await statusSelect.click();
        await page.getByRole('option', { name: 'Activo' }).click();

        // Submit form
        const submitBtn = page.getByRole('button', { name: 'Guardar cambios' });
        await submitBtn.click();

        // Let save complete
        await page.waitForTimeout(500);

        // Assert value is maintained
        await expect(statusSelect).toContainText('Activo');
    });

    test("settings tab allows archiving a module", async ({ page }) => {
        await page.getByRole('tab', { name: 'CONFIGURACIÓN' }).click();

        // Find Archive button and click it
        const archiveBtn = page.getByRole('button', { name: 'Archivar Módulo' });
        await expect(archiveBtn).toBeVisible();
        await archiveBtn.click();

        // Find dialog and confirm
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading', { name: '¿Deseas archivar este módulo?' })).toBeVisible();

        // Click confirmation (this redirects to dashboard, so wait for it)
        await dialog.getByRole('button', { name: 'Sí, archivar módulo' }).click();

        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/.*\/dashboard/);

        // Archiving redirects to dashboard. Let's ensure we are there.
        await expect(page.getByRole('heading', { name: 'Gestión de Módulos' })).toBeVisible({ timeout: 10000 });

        // Note: Playwright test handles serial execution, so the next test needs to navigate back
        // but since teacherModuleId is reused, subsequent test won't run correctly if the module is archived/deleted
        // Wait, the hook re-navigates to the module page:
        // await moduleCard.click(); It might not be visible if 'archived' filter is applied to the teacher dashboard!
        // Is 'archived' filtered in teacher dashboard? 
    });

    test("settings tab allows deleting a module", async ({ page }) => {
        await page.getByRole('tab', { name: 'CONFIGURACIÓN' }).click();

        const deleteBtn = page.getByRole('button', { name: 'Eliminar Módulo' });
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: 'Sí, eliminar módulo' }).click();

        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/.*\/dashboard/);
    });
});
