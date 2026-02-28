import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { ModuleDetailPage } from "./module-detail-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

// Run tests serially — they share state (module, user)
test.describe.configure({ mode: "serial" });

let teacherModuleId: string;
let emptyModuleId: string;
let testEmail: string;
let testUserId: string;
const password = "password123";

test.describe("Module Detail", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("mod-detail");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Teacher Detail", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // Create a test module with units
        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "Redes Locales E2E", description: "Test module", icon: "Network", teacher_id: user.id })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        teacherModuleId = mod.id;

        // Create an empty module
        const { data: emptyMod } = await supabase
            .from("modules")
            .insert({ name: "Modulo Vacio E2E", description: "No units", icon: "BookOpen", teacher_id: user.id })
            .select("id")
            .single();
        if (!emptyMod) throw new Error("Could not create empty module");
        emptyModuleId = emptyMod.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        // Clean up only OUR test user data
        await supabase.from("units").delete().eq("module_id", teacherModuleId);
        await supabase.from("units").delete().eq("module_id", emptyModuleId);
        await supabase.from("modules").delete().eq("teacher_id", testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test("navegar desde dashboard al detalle y verificar breadcrumb",
        { tag: ["@critical", "@e2e", "@module-detail", "@MODULE-DETAIL-E2E-001"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const moduleDetailPage = new ModuleDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            // Click on the module card heading
            const moduleCard = page.locator(`h3:has-text("Redes Locales E2E")`).first();
            await expect(moduleCard).toBeVisible({ timeout: 10000 });
            await moduleCard.click();
            await page.waitForURL(/\/dashboard\/modules\//, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            // Verify
            await expect(page).toHaveURL(new RegExp(teacherModuleId));
            await moduleDetailPage.verifyBreadcrumbModuleName("Redes Locales E2E");
        }
    );

    test("crear una unidad didactica desde el detalle del modulo",
        { tag: ["@critical", "@e2e", "@module-detail", "@MODULE-DETAIL-E2E-002"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const moduleDetailPage = new ModuleDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");
            await moduleDetailPage.goto(teacherModuleId);

            // Verify page loaded
            await expect(moduleDetailPage.addUnitButton).toBeVisible({ timeout: 10000 });

            // Create unit
            await moduleDetailPage.createUnit("U.D.1 Introduccion", "Conceptos basicos de redes");

            // Wait for form processing + page revalidation
            await page.waitForTimeout(2000);
            await page.waitForLoadState("networkidle");

            // Verify
            await moduleDetailPage.verifyUnitExists("U.D.1 Introduccion");
        }
    );

    test("cambiar entre tabs Dashboard, Alumnos y Configuracion",
        { tag: ["@high", "@e2e", "@module-detail", "@MODULE-DETAIL-E2E-003"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const moduleDetailPage = new ModuleDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");
            await moduleDetailPage.goto(teacherModuleId);

            await expect(moduleDetailPage.tabDashboard).toBeVisible({ timeout: 10000 });

            // Dashboard active by default
            await expect(moduleDetailPage.tabDashboard).toHaveAttribute("data-state", "active");

            // Switch to Alumnos
            await moduleDetailPage.clickTab("alumnos");
            await expect(moduleDetailPage.tabAlumnos).toHaveAttribute("data-state", "active");
            await expect(page.getByPlaceholder(/Buscar por nombre/i)).toBeVisible();

            // Switch to Configuracion
            await moduleDetailPage.clickTab("configuracion");
            await expect(moduleDetailPage.tabConfiguracion).toHaveAttribute("data-state", "active");
            await expect(page.getByRole("heading", { name: /Informaci.n General/i })).toBeVisible();

            // Switch back to Dashboard
            await moduleDetailPage.clickTab("dashboard");
            await expect(moduleDetailPage.tabDashboard).toHaveAttribute("data-state", "active");
        }
    );

    test("navegar de vuelta al dashboard usando el breadcrumb",
        { tag: ["@high", "@e2e", "@module-detail", "@MODULE-DETAIL-E2E-004"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const moduleDetailPage = new ModuleDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");
            await moduleDetailPage.goto(teacherModuleId);

            await expect(moduleDetailPage.breadcrumbInicio).toBeVisible({ timeout: 10000 });
            await moduleDetailPage.navigateToInicio();
            await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
        }
    );

    test("mostrar estado vacio cuando no hay unidades",
        { tag: ["@medium", "@e2e", "@module-detail", "@MODULE-DETAIL-E2E-005"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const moduleDetailPage = new ModuleDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");
            await moduleDetailPage.goto(emptyModuleId);

            // Verify empty state
            await expect(moduleDetailPage.emptyState).toBeVisible({ timeout: 10000 });
        }
    );
});
