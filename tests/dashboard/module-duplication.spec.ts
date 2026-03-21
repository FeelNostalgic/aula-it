import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { getSupabaseAdmin, generateTestEmail } from "../helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let teacherEmail: string;
let teacherId: string;
let moduleId: string;
let moduleName: string;
const password = "password123";

test.describe("Module Duplication", () => {
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        teacherEmail = generateTestEmail("teacher-dup");
        moduleName = "E2E Duplication Module " + Date.now();

        // Create teacher
        const { data: teacherUser, error: tErr } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Teacher Dup", role: "teacher" },
        });
        if (tErr) throw new Error(`Teacher creation failed: ${tErr.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // Create module
        const { data: mod, error: modErr } = await supabase
            .from("modules")
            .insert({ name: moduleName, description: "Duplication test", icon: "Brain", teacher_id: teacherId, status: "draft" })
            .select("id")
            .single();
        if (modErr) throw new Error(`Module creation failed: ${modErr.message}`);
        moduleId = mod.id;

        // Create a unit inside the module
        await supabase
            .from("units")
            .insert({ module_id: moduleId, name: "Unit inside module", status: "draft", order_index: 0 })
            .select("id")
            .single();
    });

    test.afterAll(async () => {
        if (!supabase) return;
        // Clean up - delete modules (cascades to units)
        if (moduleId) await supabase.from("modules").delete().eq("id", moduleId);
        // Delete copy module
        const copyName = moduleName + " - copia";
        await supabase.from("modules").delete().eq("name", copyName).eq("teacher_id", teacherId);
        // Delete teacher
        if (teacherId) await supabase.auth.admin.deleteUser(teacherId);
    });

    test("teacher can duplicate a module from dashboard", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });

        // Find the module card by its h3 heading — cards use rounded-2xl, no data-testid
        const card = page.locator('[class*="rounded-2xl"]').filter({ hasText: moduleName }).first();
        await expect(card).toBeVisible({ timeout: 10000 });

        // The first button in the card is the MoreVertical (actions) button
        const moreButton = card.locator('button').first();
        await moreButton.click();

        // Click the Duplicar menu item
        const duplicateOption = page.locator('[role="menuitem"]').filter({ hasText: /duplicar/i }).first();
        await expect(duplicateOption).toBeVisible({ timeout: 5000 });
        await duplicateOption.click();

        // Verify the copy appears in the dashboard
        const copyName = moduleName + " - copia";
        await expect(page.locator('h3').filter({ hasText: copyName }).first()).toBeVisible({ timeout: 10000 });
    });
});
