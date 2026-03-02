import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { UnitDetailPage } from "./unit-detail-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

test.describe("Unit Map IDE", () => {
    let teacherModuleId: string;
    let testUnitId: string;
    let testEmail: string;
    let testUserId: string;
    const password = "password123";

    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("map-ide");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Teacher Map", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // Create a test module
        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "Map Testing Module", description: "Module to test map ide", icon: "Map", teacher_id: user.id })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        teacherModuleId = mod.id;

        // Create a test unit
        const { data: unit } = await supabase
            .from("units")
            .insert({
                module_id: teacherModuleId,
                name: "U.D. Mapa React Flow",
                description: "Testing Map IDE",
                order_index: 0,
                status: "draft"
            })
            .select("id")
            .single();
        if (!unit) throw new Error("Could not create unit");
        testUnitId = unit.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        await supabase.from("activities").delete().eq("unit_id", testUnitId);
        await supabase.from("units").delete().eq("module_id", teacherModuleId);
        await supabase.from("modules").delete().eq("teacher_id", testUserId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test("abrir el creador de mapa y verificar elementos del IDE",
        { tag: ["@critical", "@map-ide"] },
        async ({ page }) => {
            const loginPage = new LoginPage(page);
            const unitDetailPage = new UnitDetailPage(page);

            await loginPage.login(testEmail, password);
            await page.waitForURL(/\/dashboard/);

            await unitDetailPage.goto(testUnitId);
            await page.waitForLoadState("networkidle");

            // Go to Map Tab
            await unitDetailPage.clickTab("mapa");
            await expect(unitDetailPage.tabMap).toHaveAttribute("data-state", "active");

            // Open IDE
            await unitDetailPage.openMapIdeButton.click();

            // Should navigate to /units/[id]/map
            await page.waitForURL(/\/units\/.*\/map/);

            // Verify IDE elements
            await expect(page.locator('main')).toBeVisible(); // The React Flow canvas container
            await expect(page.getByText("Panel de Diseño")).toBeVisible(); // Teacher Sidebar header
            await expect(page.getByText("Arrastra un reto")).toBeVisible(); // Instruction

            // Verify React Flow is active (check for a common class)
            await expect(page.locator('.react-flow')).toBeVisible();
        }
    );
});
