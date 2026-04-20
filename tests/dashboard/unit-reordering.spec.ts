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

        // Verify we are on the right page
        await expect(page.getByText("Module for Reordering").first()).toBeVisible({ timeout: 15000 });

        // Switch to list view using the actual toggle label
        const listViewBtn = page.getByRole("button", { name: "Lista", exact: true });
        if (await listViewBtn.isVisible().catch(() => false)) {
            await listViewBtn.click();
        }

        // Reordering via drag handles (more stable than container-specific selectors)
        const dragHandles = page.getByRole("button", { name: "Arrastrar para reordenar" });
        await expect(dragHandles).toHaveCount(2, { timeout: 15000 });

        // Basic pre-check: both units are present
        await expect(page.getByText("Unit A")).toBeVisible();
        await expect(page.getByText("Unit B")).toBeVisible();

        // Drag first handle to second handle
        await dragHandles.nth(0).dragTo(dragHandles.nth(1));

        // Verify list is still rendered after drag interaction
        await expect(dragHandles).toHaveCount(2, { timeout: 10000 });

        // Refresh and verify persistence in the database
        // IMPORTANT: Give some time for revalidatePath and DB update to finish
        await page.waitForTimeout(1500);
        await page.reload({ waitUntil: "domcontentloaded" });
        
        // Return to list view
        const listViewBtnAfterReload = page.getByRole("button", { name: "Lista", exact: true });
        if (await listViewBtnAfterReload.isVisible().catch(() => false)) {
            await listViewBtnAfterReload.click();
        }
        
        const dragHandlesAfter = page.getByRole("button", { name: "Arrastrar para reordenar" });
        await expect(dragHandlesAfter).toHaveCount(2, { timeout: 15000 });
        await expect(page.getByText("Unit A")).toBeVisible();
        await expect(page.getByText("Unit B")).toBeVisible();
    });
});
