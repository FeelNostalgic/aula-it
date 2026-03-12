import { test, expect } from "@playwright/test";
import { ActivityBuilderPage } from "./activity-builder-page";
import { generateTestEmail, getSupabaseAdmin } from "../helpers";

// Run tests serially — they share state and operate on the same activity
test.describe.configure({ mode: "serial" });

let testEmail: string;
let testUserId: string;
let testModuleId: string;
let testUnitId: string;
let testActivityId: string;
let originalActivityTitle: string;
const password = "password123";

test.describe("Dashboard Activity Builder", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        testEmail = generateTestEmail("act-builder");
        originalActivityTitle = "E2E Activity " + Date.now();

        // 1. Create Teacher
        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: testEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Test Teacher AB", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        testUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);

        // 2. Create Module
        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "Activity Builder E2E Module", description: "Test module", icon: "Brain", teacher_id: user.id })
            .select("id")
            .single();
        if (!mod) throw new Error("Could not create module");
        testModuleId = mod.id;

        // 3. Create Unit
        const { data: unit } = await supabase
            .from("units")
            .insert({
                module_id: testModuleId,
                name: "U.D.1 Activity E2E Testing",
                description: "Testing Playwright Activity",
                order_index: 0,
                status: "draft",
                view_type: "list"
            })
            .select("id")
            .single();
        if (!unit) throw new Error("Could not create unit");
        testUnitId = unit.id;

        // 4. Create Activity
        const { data: act, error: actError } = await supabase
            .from("activities")
            .insert({
                unit_id: testUnitId,
                title: originalActivityTitle,
                description: "Initial description",
                difficulty: "Fácil",
                order_index: 0,
                type: "theory",
                status: "draft"
            })
            .select("id")
            .single();
        if (actError || !act) throw new Error(`Could not create activity: ${actError?.message || "Unknown error"}`);
        testActivityId = act.id;
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !testUserId) return;
        // Clean up
        await supabase.from("activity_steps").delete().eq("activity_id", testActivityId);
        await supabase.from("activity_phases").delete().eq("activity_id", testActivityId);
        await supabase.from("activities").delete().eq("id", testActivityId);
        await supabase.from("units").delete().eq("id", testUnitId);
        await supabase.from("modules").delete().eq("id", testModuleId);
        await supabase.auth.admin.deleteUser(testUserId);
    });

    test.beforeEach(async ({ page }) => {
        if (!testUserId) { test.skip(); return; }
        await loginUser(page, testEmail, password); // Log in
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");
    });

    test("User can update activity settings and status", { tag: ["@e2e", "@activity-builder", "@critical", "@AB-E2E-001"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);

        await builder.goto(testActivityId);

        // Settings panel test
        await builder.openSettings();
        await builder.updateSettings({
            title: "Updated Activity Title E2E",
            description: "Updated Description for Test"
        });

        // Verify Title updated
        await expect(builder.headerTitle).toHaveText("Updated Activity Title E2E");

        // Status toggle
        await expect(builder.btnPublishToggle).toHaveText(/Borrador/i);
        await builder.toggleStatus();
        await expect(builder.btnPublishToggle).toHaveText(/Publicado/i);
    });

    test("User can create phases and steps", { tag: ["@e2e", "@activity-builder", "@high", "@AB-E2E-002"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);
        await builder.goto(testActivityId);

        await builder.addPhase("Fase de Prueba");
        await builder.addStep("Fase de Prueba", "Teoría 1", "Teoría");
        await builder.addStep("Fase de Prueba", "Recursos 1", "Recursos");
        await builder.addStep("Fase de Prueba", "Test 1", "Cuestionario");

        await builder.verifyStepVisible("Teoría 1");
        await builder.verifyStepVisible("Recursos 1");
        await builder.verifyStepVisible("Test 1");
    });

    test("User can edit Resource steps with Drag-and-Drop", { tag: ["@e2e", "@activity-builder", "@high", "@AB-E2E-003"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);
        await builder.goto(testActivityId);

        await builder.clickStep("Recursos 1");
        // Verify central editor opens with the right title
        await expect(page.getByRole('heading', { name: "Gestor de Recursos" })).toBeVisible();

        await builder.addResource("https://google.com", "Enlace a Google");
        await builder.addResource("https://example.com/file.pdf", "Un PDF de prueba");

        // Verify they are added visually
        const resourceCards = page.getByTestId('resource-card');
        await expect(resourceCards.nth(0).getByPlaceholder('Título del recurso')).toHaveValue('Enlace a Google');
        await expect(resourceCards.nth(1).getByPlaceholder('Título del recurso')).toHaveValue('Un PDF de prueba');
    });

    test("User can integrate Google Forms in Quiz Editor", { tag: ["@e2e", "@activity-builder", "@medium", "@AB-E2E-004"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);
        await builder.goto(testActivityId);

        await builder.clickStep("Test 1");

        await builder.toggleQuizToGoogleForms("https://docs.google.com/forms/d/e/1FAIpQLSf4/viewform?embedded=true");

        // Verify iframe exists
        await expect(page.locator('iframe')).toBeVisible();
    });

    test("Student Preview matches IDE environment", { tag: ["@e2e", "@activity-builder", "@critical", "@AB-E2E-005"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);
        await builder.goto(testActivityId);

        await builder.enterStudentPreview();

        // Ensure sidebar has the elements
        await expect(builder.sidebarContainer.getByText('Fase de Prueba')).toBeVisible();
        await builder.verifyStepVisible('Teoría 1');

        // Auto-selects first visible step
        await expect(builder.editorContainer.getByRole('heading', { name: 'Teoría 1' })).toBeVisible();

        // Navigation buttons
        const btnNext = page.getByRole('button', { name: 'Siguiente Paso' });
        await expect(btnNext).toBeVisible();
        await btnNext.click();

        // Next step should be Recursos 1
        await expect(builder.editorContainer.getByRole('heading', { name: 'Recursos 1' })).toBeVisible();

        await builder.exitStudentPreview();
        // Back to editor
        await expect(page.getByRole('button', { name: 'Añadir Fase' })).toBeVisible();
    });

    test("no debe crear fase con título vacío", { tag: ["@e2e", "@activity-builder", "@medium", "@AB-E2E-006"] }, async ({ page }) => {
        const builder = new ActivityBuilderPage(page);
        await builder.goto(testActivityId);

        // Count phases currently in sidebar
        const phasesBefore = await builder.sidebarContainer.locator('[data-phase-title]').count();

        // Open the "Nueva Fase" dialog
        await builder.btnAddPhase.click();
        const dialog = page.getByRole('dialog', { name: 'Nueva Fase' });
        await expect(dialog).toBeVisible();

        // Leave title empty — click "Crear Fase" without filling anything
        await dialog.getByRole('button', { name: 'Crear Fase' }).click();

        // Component guard: empty title → dialog closes silently, no phase created
        await expect(dialog).toBeHidden({ timeout: 3000 });

        // Sidebar must still have the same number of phases
        const phasesAfter = await builder.sidebarContainer.locator('[data-phase-title]').count();
        expect(phasesAfter).toBe(phasesBefore);
    });
});

async function loginUser(page: import('@playwright/test').Page, email: string, pass: string) {
    const { LoginPage } = await import("../auth/login-page");
    const loginPage = new LoginPage(page);
    await loginPage.login(email, pass);
}
