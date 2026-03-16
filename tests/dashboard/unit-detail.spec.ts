import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { ModuleDetailPage } from "./module-detail-page";
import { UnitDetailPage } from "./unit-detail-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

// Run tests serially — they share state (module, unit, user)
test.describe.configure({ mode: "serial" });

let teacherModuleId: string;
let testUnitId: string;
let testEmail: string;
let testUserId: string;
const password = "password123";

test.describe("Unit Detail (Creador del Mapa)", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("unit-detail");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Teacher Unit", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // Create a test module
        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "Testing Units Module", description: "Module to test units", icon: "Brain", teacher_id: user.id })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        teacherModuleId = mod.id;

        // Create a test unit for this module
        const { data: unit } = await supabase
            .from("units")
            .insert({
                module_id: teacherModuleId,
                name: "U.D.1 Intro a Testing",
                description: "Testing Playwright",
                order_index: 0,
                status: "draft",
                view_type: "list"
            })
            .select("id")
            .single();
        if (!unit) throw new Error("Could not create unit");
        testUnitId = unit.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        // Clean up our test user data
        await supabase.from("activities").delete().eq("unit_id", testUnitId);
        await supabase.from("units").delete().eq("module_id", teacherModuleId);
        await supabase.from("modules").delete().eq("teacher_id", testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test("navegar al detalle de la unidad y ver tabs",
        { tag: ["@critical", "@e2e", "@unit-detail", "@UNIT-DETAIL-E2E-001"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Verify basic top level elements
            await expect(page.getByRole("heading", { name: "U.D.1 Intro a Testing" })).toBeVisible();
            await expect(page.getByText("BORRADOR")).toBeVisible();

            // Verify tabs
            await expect(unitDetailPage.tabActivities).toBeVisible();
            await expect(unitDetailPage.tabEvaluation).toBeVisible();
            await expect(unitDetailPage.tabSettings).toBeVisible();

            // Activities Tab is default (URL ends in /retos)
            await expect(page).toHaveURL(/\/retos/);
        }
    );

    test("crear retos en la unidad",
        { tag: ["@critical", "@e2e", "@unit-detail", "@UNIT-DETAIL-E2E-002"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Verify empty state first
            await expect(unitDetailPage.emptyState).toBeVisible();

            // Create First Activity
            await unitDetailPage.createActivity("A1: Teoría básica", "Lee el documento adjunto.");

            // Verify success toast appears
            await expect(page.getByText("¡Reto creado con éxito!")).toBeVisible();

            // Wait for form processing + page revalidation
            await page.waitForLoadState("networkidle");

            // Verify first activity exists
            await unitDetailPage.verifyActivityExists("A1: Teoría básica");

            // Create Second Activity
            await unitDetailPage.createActivity("A2: Cuestionario de prueba");
            await page.waitForTimeout(2000);
            await page.waitForLoadState("networkidle");

            // Verify both exist
            await unitDetailPage.verifyActivityExists("A1: Teoría básica");
            await unitDetailPage.verifyActivityExists("A2: Cuestionario de prueba");
        }
    );

    test("reordenar actividades (drag and drop)",
        { tag: ["@high", "@e2e", "@unit-detail", "@UNIT-DETAIL-E2E-003"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Ensure activities exist for the drag and drop test
            await Promise.race([
                unitDetailPage.emptyState.waitFor({ state: 'visible', timeout: 5000 }),
                unitDetailPage.activitiesList.first().waitFor({ state: 'visible', timeout: 5000 })
            ]).catch(() => {});

            const currentActivities = await unitDetailPage.activitiesList.allTextContents();
            const hasA1 = currentActivities.some(t => t.includes("A1"));
            const hasA2 = currentActivities.some(t => t.includes("A2"));

            if (!hasA1) {
                await unitDetailPage.createActivity("A1: Teoría básica");
            }
            if (!hasA2) {
                await unitDetailPage.createActivity("A2: Cuestionario de prueba");
            }

            // Wait for both to be rendered and in correct initial order
            await expect(unitDetailPage.activitiesList.nth(0)).toHaveText(/A1/);
            await expect(unitDetailPage.activitiesList.nth(1)).toHaveText(/A2/);

            const firstRowTitle = unitDetailPage.activitiesList.first();
            const secondRowTitle = unitDetailPage.activitiesList.nth(1);

            await expect(firstRowTitle).toHaveText("A1: Teoría básica");
            await expect(secondRowTitle).toHaveText("A2: Cuestionario de prueba");

            // Move the first one down by dragging it to the second one
            await unitDetailPage.dragActivity(0, 1);

            // Give some time for DB update and revalidatePath
            await page.waitForTimeout(1000);
            await page.waitForLoadState("networkidle");

            // Now order should be A2, then A1
            await expect(unitDetailPage.activitiesList.nth(0)).toHaveText("A2: Cuestionario de prueba");
            await expect(unitDetailPage.activitiesList.nth(1)).toHaveText("A1: Teoría básica");
        }
    );


    test("modificar configuracion de la unidad (publicar)",
        { tag: ["@high", "@e2e", "@unit-detail", "@UNIT-DETAIL-E2E-004"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Go to settings tab
            await unitDetailPage.clickTab("configuracion");
            await expect(page).toHaveURL(/\/configuracion/);

            // Change Title
            await unitDetailPage.titleInput.fill("U.D.1 Intro Modificada");

            // Open Select status
            await unitDetailPage.statusSelect.click();
            // Select "Publicado" (active in DB represented visually as Publicado)
            await page.getByRole("option", { name: /Publicado/i }).click();

            await unitDetailPage.saveSettingsButton.click();

            await page.waitForTimeout(2000);
            await page.waitForLoadState("networkidle");

            // Verify visually updated to PUBLICADO in the Badge
            await expect(page.getByText("PUBLICADO").first()).toBeVisible();
            await expect(page.getByRole("heading", { name: "U.D.1 Intro Modificada" })).toBeVisible();
        }
    );
});
