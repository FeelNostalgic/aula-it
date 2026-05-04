import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
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
            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            // Navigate directly to avoid flaky tab-link transitions.
            await gotoUnitBadgesPage(page, testUnitId);

            // Verify the manager heading is visible to ensure tab content rendered
            await expect(page.getByText("Gestión de insignias globales")).toBeVisible({ timeout: 10000 });

            const dialog = await openCreateBadgeDialog(page);
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole("heading", { name: "Nueva insignia" })).toBeVisible();

            // Fill in the title (identified via label "Título de la Insignia")
            await dialog.getByLabel(/t[íi]tulo de la insignia/i).fill("Insignia de Prueba E2E");

            // Fill in the description
            await dialog.getByLabel(/descripci[óo]n/i).fill("Descripción de prueba para el test E2E.");

            // Submit
            await dialog.getByRole("button", { name: "Guardar Insignia" }).click();
            await expect(page.getByText("Insignia creada")).toBeVisible({ timeout: 10000 });
            await closeDialogIfStillOpen(page, dialog);

            // Assert badge appears in the list. The manager updates local state after create,
            // so reloading here would only add auth/session flakiness to the assertion.
            const createdBadgeTitle = page.locator('h4').filter({ hasText: "Insignia de Prueba E2E" }).first();
            await expect(createdBadgeTitle).toBeVisible({ timeout: 15000 });
        }
    );

    test(
        "editar una insignia existente",
        { tag: ["@high", "@e2e", "@badges", "@BADGE-MGMT-E2E-002"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            // Navigate directly to avoid flaky tab-link transitions.
            await gotoUnitBadgesPage(page, testUnitId);
            await expect(page.getByText("Gestión de insignias globales")).toBeVisible({ timeout: 10000 });

            // Verify the badge from the previous test is present
            const badgeCard = page.locator("div.group").filter({
                has: page.locator('h4', { hasText: "Insignia de Prueba E2E" }),
            }).first();
            if (!(await badgeCard.isVisible({ timeout: 3000 }).catch(() => false))) {
                await page.getByRole("button", { name: "NUEVA INSIGNIA", exact: true }).click();
                const createDialog = page.locator('div[role="dialog"]');
                await expect(createDialog).toBeVisible();
                await createDialog.getByLabel("Título de la insignia").fill("Insignia de Prueba E2E");
                await createDialog.getByLabel("Descripción").fill("Descripción de prueba para el test E2E.");
                await createDialog.getByRole("button", { name: "Guardar Insignia" }).click();
                await expect(page.getByText("Insignia creada")).toBeVisible({ timeout: 10000 });
                await closeDialogIfStillOpen(page, createDialog);
            }
            await expect(badgeCard).toBeVisible({ timeout: 10000 });

            // The edit/delete buttons are only visible on hover (opacity-0 group-hover:opacity-100)
            // Use hover to reveal them, then click the Edit2 icon button (first icon button in the card actions)
            await badgeCard.hover();

            // The edit button comes before the delete button — click the first icon button in the action group
            const actionButtons = badgeCard.locator("div.absolute.top-2.right-2 button, div.shrink-0.ml-auto button");
            await actionButtons.first().click();

            const dialog = page.locator('div[role="dialog"]');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole("heading", { name: /Editar insignia/i })).toBeVisible();

            // Clear and update the title
            const titleInput = dialog.getByLabel("Título de la insignia");
            await titleInput.clear();
            await titleInput.fill("Insignia de Prueba Editada");

            // Submit
            await dialog.getByRole("button", { name: "Guardar Insignia" }).click();

            // Assert success toast
            await expect(page.getByText("Insignia actualizada")).toBeVisible({ timeout: 8000 });
            await closeDialogIfStillOpen(page, dialog);

            // Assert updated title is visible in the list
            await expect(page.locator('h4').filter({ hasText: "Insignia de Prueba Editada" }).first()).toBeVisible({ timeout: 10000 });
        }
    );

    test(
        "eliminar una insignia",
        { tag: ["@high", "@e2e", "@badges", "@BADGE-MGMT-E2E-003"] },
        async ({ page }) => {
            if (!testUserId) { test.skip(); return; }

            const loginPage = new LoginPage(page);
            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });

            // Navigate directly to avoid flaky tab-link transitions.
            await gotoUnitBadgesPage(page, testUnitId);
            await expect(page.getByText("Gestión de insignias globales")).toBeVisible({ timeout: 10000 });

            // Verify badge from previous test is present
            const badgeCard = page.locator("div.group").filter({
                has: page.locator('h4', { hasText: "Insignia de Prueba Editada" }),
            }).first();
            if (!(await badgeCard.isVisible({ timeout: 3000 }).catch(() => false))) {
                const createDialog = await openCreateBadgeDialog(page);
                await createDialog.getByLabel("Título de la insignia").fill("Insignia de Prueba Editada");
                await createDialog.getByLabel("Descripción").fill("Descripción de prueba para el test E2E.");
                await createDialog.getByRole("button", { name: "Guardar Insignia" }).click();
                await expect(page.getByText("Insignia creada")).toBeVisible({ timeout: 10000 });
                await closeDialogIfStillOpen(page, createDialog);
            }
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

            if (await alertDialog.isVisible().catch(() => false)) {
                await page.keyboard.press("Escape");
            }

            // Assert success toast
            await expect(page.getByText("Insignia eliminada")).toBeVisible({ timeout: 8000 });

            // The client badge manager updates local state after delete; verify the targeted badge disappears.
            await expect(page.locator('h4', { hasText: "Insignia de Prueba Editada" })).toHaveCount(0, { timeout: 10000 });
            await expect(page.getByText("Gestión de insignias globales")).toBeVisible({ timeout: 10000 });
        }
    );
});

async function openCreateBadgeDialog(page: import("@playwright/test").Page) {
    const dialog = page.getByRole("dialog").filter({
        has: page.getByRole("heading", { name: /Nueva insignia/i }),
    });

    const primaryTrigger = page.getByRole("button", { name: "NUEVA INSIGNIA", exact: true });
    const emptyStateTrigger = page.getByRole("button", { name: /Crear Primera Insignia/i });

    if (await primaryTrigger.isVisible().catch(() => false)) {
        await primaryTrigger.click();
    } else {
        await expect(emptyStateTrigger).toBeVisible({ timeout: 10000 });
        await emptyStateTrigger.click();
    }

    await expect(dialog).toBeVisible({ timeout: 10000 });
    return dialog;
}

async function closeDialogIfStillOpen(
    page: import("@playwright/test").Page,
    dialog: import("@playwright/test").Locator
) {
    if (await dialog.isHidden({ timeout: 5000 }).catch(() => false)) {
        return;
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5000 });
}

async function gotoUnitBadgesPage(page: import("@playwright/test").Page, unitId: string) {
    const target = `/dashboard/units/${unitId}/insignias`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
            await expect(page).toHaveURL(new RegExp(`/dashboard/units/${unitId}/insignias`), { timeout: 15000 });
            return;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const retryable =
                message.includes("ERR_ABORTED") ||
                message.includes("frame was detached") ||
                message.includes("ERR_CONNECTION_REFUSED");
            if (!retryable || attempt === 2) throw error;
            await page.waitForTimeout(700);
        }
    }
}
