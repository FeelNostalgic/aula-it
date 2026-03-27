import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { ModuleDetailPage } from "./module-detail-page";
import { getSupabaseAdmin } from "../helpers";

test.describe("Unit Reordering (Drag and Drop)", () => {
    let testUserId: string;
    let testModuleId: string;
    let unit1Id: string;
    let unit2Id: string;

    let testEmail: string;

    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not initialized");

        // Create teacher
        testEmail = `teacher-reorder-${Date.now()}@example.com`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: "Password123!",
            email_confirm: true
        });
        if (authError || !authData.user) throw new Error(`Failed to create test teacher: ${authError?.message}`);
        
        testUserId = authData.user.id;
        const { error: profileError } = await supabase.from("profiles").upsert({ id: testUserId, full_name: "Teacher Reorder", role: "teacher" });
        if (profileError) throw new Error(`Failed to create/update teacher profile: ${profileError.message}`);

        // Create module
        const { data: moduleData, error: moduleError } = await supabase.from("modules").insert({
            name: "Module for Reordering",
            teacher_id: testUserId,
            icon: "BookOpen",
            status: "active"
        }).select().single();
        if (moduleError || !moduleData) throw new Error(`Failed to create test module: ${moduleError?.message}`);
        testModuleId = moduleData.id;

        // Create 2 units
        const { error: u1Error } = await supabase.from("units").insert({
            module_id: testModuleId,
            name: "Unit A",
            order_index: 0,
            status: "published"
        });
        if (u1Error) throw new Error(`Failed to create Unit A: ${u1Error.message}`);

        const { error: u2Error } = await supabase.from("units").insert({
            module_id: testModuleId,
            name: "Unit B",
            order_index: 1,
            status: "published"
        });
        if (u2Error) throw new Error(`Failed to create Unit B: ${u2Error.message}`);
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        if (testModuleId) {
            await supabase.from("units").delete().eq("module_id", testModuleId);
            await supabase.from("modules").delete().eq("id", testModuleId);
        }
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test("teacher can reorder units using drag and drop in list view", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const moduleDetailPage = new ModuleDetailPage(page);

        await loginPage.login(testEmail, "Password123!");
        await page.waitForURL("**/dashboard", { timeout: 15000 });
        
        await moduleDetailPage.goto(testModuleId);
        
        // Wait for URL and network to settle
        await expect(page).toHaveURL(new RegExp(`.*${testModuleId}`), { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Verify we are on the right page
        await expect(page.getByText("Module for Reordering").first()).toBeVisible({ timeout: 15000 });

        // Switch to list view using the actual toggle label
        const listViewBtn = page.getByRole("button", { name: "Lista", exact: true });
        await expect(listViewBtn).toBeVisible({ timeout: 10000 });
        await listViewBtn.click();

        // Use test-id for unambiguous selection
        const listContainer = page.getByTestId("units-list-container");
        await expect(listContainer).toBeVisible({ timeout: 10000 });

        // Select the unit cards within the list container
        const unitCards = listContainer.locator('> div[class*="bg-surface-dark"]');
        await expect(unitCards).toHaveCount(2, { timeout: 10000 });

        const firstUnitBefore = unitCards.nth(0);
        const secondUnitBefore = unitCards.nth(1);

        await expect(firstUnitBefore).toContainText("Unit A");
        await expect(secondUnitBefore).toContainText("Unit B");

        // Perform Drag and Drop using the handle
        const handleA = firstUnitBefore.locator('button[aria-label="Arrastrar para reordenar"]');
        const cardB = secondUnitBefore;

        const sourceBox = await handleA.boundingBox();
        const targetBox = await cardB.boundingBox();

        if (!sourceBox || !targetBox) throw new Error("Could not find bounding boxes for DnD");

        // Drag handle of Unit A to the bottom of Unit B
        await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
        await page.mouse.down();
        // Hover over B for a bit to trigger dnd-kit logic - use more steps for smoother move in CI
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.8, { steps: 50 });
        await page.waitForTimeout(500); // Wait for sortable animation
        await page.mouse.up();

        // Verify visual swap in the UI
        await expect(unitCards.nth(0)).toContainText("Unit B");
        await expect(unitCards.nth(1)).toContainText("Unit A");

        // Refresh and verify persistence in the database
        // IMPORTANT: Give some time for revalidatePath and DB update to finish
        await page.waitForTimeout(1500);
        await page.reload();
        await page.waitForLoadState("networkidle");
        
        // Return to list view
        await page.getByRole("button", { name: "Lista", exact: true }).click();
        
        const unitCardsAfter = page.getByTestId("units-list-container").locator('> div[class*="bg-surface-dark"]');
        await expect(unitCardsAfter.nth(0)).toContainText("Unit B");
        await expect(unitCardsAfter.nth(1)).toContainText("Unit A");
    });
});
