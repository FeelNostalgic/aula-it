import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { SettingsPage } from "./settings-page";
import { generateTestEmail, getSupabaseAdmin } from "./helpers";

// Run tests serially — they share a single seeded teacher user
test.describe.configure({ mode: "serial" });

let teacherEmail: string;
let teacherUserId: string;
const password = "password123";

test.describe("Settings Page", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        teacherEmail = generateTestEmail("settings-teacher");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Settings Teacher", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        teacherUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !teacherUserId) return;
        await supabase.auth.admin.deleteUser(teacherUserId);
    });

    test(
        "la página /settings carga y muestra el tab Profile activo",
        { tag: ["@critical", "@e2e", "@settings", "@SETTINGS-E2E-001"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            await settingsPage.goto();
            await page.waitForLoadState("networkidle");

            await expect(settingsPage.tabProfile).toBeVisible();
            await expect(settingsPage.tabSettings).toBeVisible();
            await expect(settingsPage.tabProfile).toHaveAttribute("data-state", "active");
        }
    );

    test(
        "el profesor puede actualizar su nombre completo y ver el toast de éxito",
        { tag: ["@high", "@e2e", "@settings", "@SETTINGS-E2E-002"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            await settingsPage.goto();
            await page.waitForLoadState("networkidle");

            await settingsPage.openSettingsTab();

            await settingsPage.updateFullName("Settings Teacher Editado");

            await expect(page.getByText("Perfil actualizado correctamente.")).toBeVisible({ timeout: 8000 });
        }
    );

    test(
        "el toggle de privacidad se puede activar y guarda correctamente",
        { tag: ["@high", "@e2e", "@settings", "@SETTINGS-E2E-003"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            await settingsPage.goto();
            await page.waitForLoadState("networkidle");

            await settingsPage.openSettingsTab();

            // Toggle privacy — first click toggles to either anónimo or público
            await settingsPage.privacyToggle.click();

            await expect(
                page.getByText(/Modo anónimo activado|Modo público activado/)
            ).toBeVisible({ timeout: 8000 });
        }
    );

    test(
        "el profesor ve la sección de Google Drive en el tab Settings",
        { tag: ["@high", "@e2e", "@settings", "@SETTINGS-E2E-004"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            await settingsPage.goto();
            await page.waitForLoadState("networkidle");

            await settingsPage.openSettingsTab();

            await expect(settingsPage.driveSection).toBeVisible();
        }
    );
});
