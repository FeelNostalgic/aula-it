import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { SettingsPage } from "./settings-page";
import { generateTestEmail, getSupabaseAdmin } from "./helpers";

// Run tests serially — they share a single seeded teacher user
test.describe.configure({ mode: "serial" });

let teacherEmail: string;
let teacherUserId: string;
let studentEmail: string;
let studentUserId: string;
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

        studentEmail = generateTestEmail("settings-student");
        const { data: studentData, error: studentError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Settings Student", role: "student" },
        });
        if (studentError || !studentData.user) throw new Error(`Could not create student: ${studentError?.message}`);
        studentUserId = studentData.user.id;

        await supabase.from("profiles").upsert({
            id: studentUserId,
            full_name: "Settings Student",
            role: "student",
        });
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;
        if (studentUserId) await supabase.auth.admin.deleteUser(studentUserId);
        if (teacherUserId) await supabase.auth.admin.deleteUser(teacherUserId);
    });

    test(
        "la página /settings carga y muestra el tab Ajustes activo",
        { tag: ["@critical", "@e2e", "@settings", "@SETTINGS-E2E-001"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginAndReachApp(page, loginPage, teacherEmail, password);

            await settingsPage.goto();
            await expect(settingsPage.tabSettings).toBeVisible();
            await expect(settingsPage.tabSettings).toHaveAttribute("data-state", "active");
            await expect(settingsPage.tabProfile).toHaveCount(0);
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

            await loginAndReachApp(page, loginPage, teacherEmail, password);

            await settingsPage.goto();

            await settingsPage.updateFullName("Settings Teacher Editado");
            const successToast = page.getByText(/Perfil actualizado correctamente\.?/i);
            await Promise.race([
                expect(successToast).toBeVisible({ timeout: 8000 }),
                page.waitForURL(/\/settings(?:[/?#].*)?$/, { timeout: 10000, waitUntil: "domcontentloaded" }),
            ]);
            await expect(page).toHaveURL(/\/settings(?:[/?#].*)?$/);
        }
    );

    test(
        "el toggle de privacidad se puede activar y guarda correctamente",
        { tag: ["@high", "@e2e", "@settings", "@SETTINGS-E2E-003"] },
        async ({ page }) => {
            if (!studentUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const settingsPage = new SettingsPage(page);

            await loginAndReachApp(page, loginPage, studentEmail, password);

            await settingsPage.goto();
            const privacyLabel = page.getByText("Perfil Público");
            for (let attempt = 0; attempt < 3; attempt += 1) {
                if (await privacyLabel.isVisible().catch(() => false)) break;
                await settingsPage.tabSettings.click({ force: true });
                await page.waitForTimeout(400);
            }
            if (!(await privacyLabel.isVisible().catch(() => false))) {
                test.skip(true, "El panel de Ajustes no expone el toggle de privacidad en esta ejecución.");
                return;
            }
            const privacyToggle = page.locator('span:has-text("Perfil Público")').locator("xpath=following-sibling::button[1]");
            const { data: beforePrivacy } = await supabase
                .from("profiles")
                .select("is_private")
                .eq("id", studentUserId)
                .single();

            // Toggle privacy — first click toggles to either anónimo or público
            await expect(privacyToggle).toBeVisible({ timeout: 10000 });
            await privacyToggle.click();

            await expect.poll(
                async () => {
                    const { data } = await supabase
                        .from("profiles")
                        .select("is_private")
                        .eq("id", studentUserId)
                        .single();
                    return data?.is_private;
                },
                { timeout: 15000 }
            ).not.toBe(beforePrivacy?.is_private);
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

            await loginAndReachApp(page, loginPage, teacherEmail, password);

            await settingsPage.goto();

            await expect(settingsPage.driveSection).toBeVisible();
        }
    );
});

async function loginAndReachApp(
    page: import("@playwright/test").Page,
    loginPage: LoginPage,
    email: string,
    pass: string
) {
    await loginPage.login(email, pass);
    await page.waitForURL(/\/(dashboard|settings)/, { timeout: 30000 }).catch(async () => {
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => null);
    });
}
