import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { UnitDetailPage } from "./unit-detail-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

// Tests share state (same unit) — run serially
test.describe.configure({ mode: "serial" });

let teacherModuleId: string;
let testUnitId: string;
let testEmail: string;
let testUserId: string;
const password = "password123";

test.describe("Badge Management (Gestión de Insignias)", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("badge-mgmt");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Teacher Badges", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        const { data: mod } = await supabase
            .from("modules")
            .insert({
                name: "Badge Testing Module",
                description: "Module to test badge management",
                icon: "Award",
                teacher_id: user.id,
            })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        teacherModuleId = mod.id;

        const { data: unit } = await supabase
            .from("units")
            .insert({
                module_id: teacherModuleId,
                name: "U.D.1 Badge Test Unit",
                description: "Unit for testing badge management",
                order_index: 0,
                status: "draft",
                view_type: "list",
            })
            .select("id")
            .single();
        if (!unit) throw new Error("Could not create unit");
        testUnitId = unit.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        await supabase.from("class_badges").delete().eq("unit_id", testUnitId);
        await supabase.from("units").delete().eq("module_id", teacherModuleId);
        await supabase.from("modules").delete().eq("teacher_id", testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test(
        "crear una insignia global",
        { tag: ["@critical", "@e2e", "@badges", "@BADGE-MGMT-E2E-001"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Navigate to the INSIGNIAS tab
            const insigniasTab = page.getByRole("tab", { name: /INSIGNIAS/i });
            await insigniasTab.click();
            
            // Wait for tab to be active
            await expect(insigniasTab).toHaveAttribute("data-state", "active", { timeout: 10000 });

            // Verify the manager heading is visible to ensure tab content rendered
            await expect(page.getByText("Gestión de Insignias Globales")).toBeVisible({ timeout: 10000 });

            // Verify empty state is shown before creating
            await expect(page.getByText(/No hay insignias/i)).toBeVisible({ timeout: 15000 });
            await expect(page.getByRole("button", { name: /Crear Primera Insignia/i })).toBeVisible({ timeout: 10000 });

            // Open create dialog using the header button
            await page.getByRole("button", { name: "Nueva Insignia" }).click();

            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole("heading", { name: "Nueva Insignia" })).toBeVisible();

            // Fill in the title (identified via label "Título de la Insignia")
            await dialog.getByLabel("Título de la Insignia").fill("Insignia de Prueba E2E");

            // Fill in the description
            await dialog.getByLabel("Descripción").fill("Descripción de prueba para el test E2E.");

            // Submit
            await dialog.getByRole("button", { name: "Guardar Insignia" }).click();

            // Wait for dialog to close and page to revalidate
            await expect(dialog).toBeHidden({ timeout: 10000 });
            await page.waitForLoadState("networkidle");

            // Assert success toast
            await expect(page.getByText("Insignia creada")).toBeVisible({ timeout: 8000 });

            // Assert badge appears in the list
            await expect(page.locator('h4').filter({ hasText: "Insignia de Prueba E2E" }).first()).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        "editar una insignia existente",
        { tag: ["@high", "@e2e", "@badges", "@BADGE-MGMT-E2E-002"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Navigate to the INSIGNIAS tab
            await page.getByRole("tab", { name: /INSIGNIAS/i }).click();
            await page.waitForLoadState("networkidle");

            // Verify the badge from the previous test is present
            const badgeCard = page.locator("div.group").filter({
                has: page.locator('h4', { hasText: "Insignia de Prueba E2E" }),
            }).first();
            await expect(badgeCard).toBeVisible({ timeout: 10000 });

            // The edit/delete buttons are only visible on hover (opacity-0 group-hover:opacity-100)
            // Use hover to reveal them, then click the Edit2 icon button (first icon button in the card actions)
            await badgeCard.hover();

            // The edit button comes before the delete button — click the first icon button in the action group
            const actionButtons = badgeCard.locator("div.absolute.top-2.right-2 button, div.shrink-0.ml-auto button");
            await actionButtons.first().click();

            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole("heading", { name: "Editar Insignia" })).toBeVisible();

            // Clear and update the title
            const titleInput = dialog.getByLabel("Título de la Insignia");
            await titleInput.clear();
            await titleInput.fill("Insignia de Prueba Editada");

            // Submit
            await dialog.getByRole("button", { name: "Guardar Insignia" }).click();

            await expect(dialog).toBeHidden({ timeout: 10000 });
            await page.waitForLoadState("networkidle");

            // Assert success toast
            await expect(page.getByText("Insignia actualizada")).toBeVisible({ timeout: 8000 });

            // Assert updated title is visible in the list
            await expect(page.locator('h4').filter({ hasText: "Insignia de Prueba Editada" }).first()).toBeVisible({ timeout: 10000 });

            // Old title should no longer be present
            await expect(page.locator('h4', { hasText: "Insignia de Prueba E2E" })).toHaveCount(0);
        }
    );

    test(
        "eliminar una insignia",
        { tag: ["@high", "@e2e", "@badges", "@BADGE-MGMT-E2E-003"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Navigate to the INSIGNIAS tab
            await page.getByRole("tab", { name: /INSIGNIAS/i }).click();
            await page.waitForLoadState("networkidle");

            // Verify badge from previous test is present
            const badgeCard = page.locator("div.group").filter({
                has: page.locator('h4', { hasText: "Insignia de Prueba Editada" }),
            }).first();
            await expect(badgeCard).toBeVisible({ timeout: 10000 });

            // Hover to reveal the action buttons and click delete (second icon button)
            await badgeCard.hover();

            const actionButtons = badgeCard.locator("div.absolute.top-2.right-2 button, div.shrink-0.ml-auto button");
            await actionButtons.nth(1).click();

            // Confirm in AlertDialog
            const alertDialog = page.locator('div[role="alertdialog"]');
            await expect(alertDialog).toBeVisible();
            await expect(alertDialog.getByRole("heading", { name: "¿Eliminar esta insignia?" })).toBeVisible();

            await alertDialog.getByRole("button", { name: "Eliminar Insignia" }).click();

            await expect(alertDialog).toBeHidden({ timeout: 10000 });
            await page.waitForLoadState("networkidle");

            // Assert success toast
            await expect(page.getByText("Insignia eliminada")).toBeVisible({ timeout: 8000 });

            // Assert badge is gone from the list
            await expect(page.locator('h4', { hasText: "Insignia de Prueba Editada" })).toHaveCount(0);

            // Empty state should be visible again
            await expect(page.getByText(/No hay insignias/i)).toBeVisible({ timeout: 15000 });
            await expect(page.getByRole("button", { name: /Crear Primera Insignia/i })).toBeVisible({ timeout: 10000 });
        }
    );
});
