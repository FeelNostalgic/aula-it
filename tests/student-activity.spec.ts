import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { getSupabaseAdmin, generateTestEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let teacherId: string;
let teacherEmail: string;
let studentId: string;
let studentEmail: string;
let moduleId: string;
let unitId: string;
let activityId: string;
let phaseId: string;
let stepId: string;
let enrollmentId: string;

const password = "password123";

test.describe("Student Activity Flow", () => {
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        // 1. Create Teacher
        teacherEmail = generateTestEmail("teacher-stud-act");
        const { data: teacherUser, error: tAuthError } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Teacher StAct", role: "teacher" },
        });
        if (tAuthError) throw new Error(`Teacher auth failed: ${tAuthError.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // 2. Create Student
        studentEmail = generateTestEmail("student-stud-act");
        const { data: studentUser, error: sAuthError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Student StAct", role: "student" },
        });
        if (sAuthError) throw new Error(`Student auth failed: ${sAuthError.message}`);
        studentId = studentUser.user.id;
        await supabase.from("profiles").update({ role: "student", global_xp: 0 }).eq("id", studentId);

        // 3. Create Module (status active so student can see it)
        const { data: module, error: modErr } = await supabase
            .from("modules")
            .insert({ name: "E2E Student Module", teacher_id: teacherId, status: "active" })
            .select("id")
            .single();
        if (modErr) throw new Error(`Module insert failed: ${modErr.message}`);
        moduleId = module.id;

        // 4. Create Unit — must be 'published' so students can access it
        const { data: unit, error: unitErr } = await supabase
            .from("units")
            .insert({ module_id: moduleId, name: "E2E Student Unit", status: "published", order_index: 0 })
            .select("id")
            .single();
        if (unitErr) throw new Error(`Unit insert failed: ${unitErr.message}`);
        unitId = unit.id;

        // 5. Create Activity — status 'published' so student sees it
        const { data: activity, error: actErr } = await supabase
            .from("activities")
            .insert({ unit_id: unitId, title: "E2E Student Activity", type: "theory", status: "published", order_index: 0 })
            .select("id")
            .single();
        if (actErr) throw new Error(`Activity insert failed: ${actErr.message}`);
        activityId = activity.id;

        // 6. Create Phase
        const { data: phase, error: phaseErr } = await supabase
            .from("activity_phases")
            .insert({ activity_id: activityId, title: "Phase 1", order_index: 0 })
            .select("id")
            .single();
        if (phaseErr) throw new Error(`Phase insert failed: ${phaseErr.message}`);
        phaseId = phase.id;

        // 7. Create Step (type 'theory' — visible to students without requiring submission)
        const { data: step, error: stepErr } = await supabase
            .from("activity_steps")
            .insert({ phase_id: phaseId, title: "E2E Theory Step", type: "theory", xp: 10, order_index: 0 })
            .select("id")
            .single();
        if (stepErr) throw new Error(`Step insert failed: ${stepErr.message}`);
        stepId = step.id;

        // 8. Enroll student in module
        const { data: enrollment, error: enrollErr } = await supabase
            .from("module_enrollments")
            .insert({ module_id: moduleId, student_id: studentId })
            .select("id")
            .single();
        if (enrollErr) throw new Error(`Enrollment insert failed: ${enrollErr.message}`);
        enrollmentId = enrollment.id;

        console.log("[student-activity] Setup complete.");
    });

    test.afterAll(async () => {
        if (!supabase) return;
        await supabase.from("activity_submissions").delete().eq("student_id", studentId);
        await supabase.from("module_enrollments").delete().eq("id", enrollmentId);
        await supabase.from("activity_steps").delete().eq("id", stepId);
        await supabase.from("activity_phases").delete().eq("id", phaseId);
        await supabase.from("activities").delete().eq("id", activityId);
        await supabase.from("units").delete().eq("id", unitId);
        await supabase.from("modules").delete().eq("id", moduleId);
        await supabase.auth.admin.deleteUser(studentId);
        await supabase.auth.admin.deleteUser(teacherId);
    });

    test("student logs in and sees enrolled module on dashboard", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(studentEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Student dashboard shows "Módulos Activos" heading
        await expect(page.getByRole("heading", { name: "Módulos Activos" })).toBeVisible({ timeout: 10000 });

        // The enrolled module card is visible
        const moduleCard = page.locator('a:has-text("E2E Student Module")').first();
        await expect(moduleCard).toBeVisible({ timeout: 10000 });
    });

    test("student navigates to module, then unit, then sees activity content", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(studentEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Navigate to module
        const moduleCard = page.locator('a:has-text("E2E Student Module")').first();
        await expect(moduleCard).toBeVisible({ timeout: 10000 });
        await moduleCard.click();
        await page.waitForURL(/\/dashboard\/modules\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // On module page, units are listed under "Unidades Didácticas"
        await expect(page.getByRole("heading", { name: "Unidades Didácticas" })).toBeVisible({ timeout: 10000 });

        // Click the unit
        const unitCard = page.locator(`a:has-text("E2E Student Unit")`).first();
        await expect(unitCard).toBeVisible({ timeout: 10000 });
        await unitCard.click();
        await page.waitForURL(/\/dashboard\/units\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Unit detail page shows the unit name
        await expect(page.locator(`h1:has-text("E2E Student Unit")`)).toBeVisible({ timeout: 10000 });

        // RETOS tab is the default for students; the activity card is visible
        const activityCard = page.locator(`h4:has-text("E2E Student Activity")`).first();
        await expect(activityCard).toBeVisible({ timeout: 10000 });

        // Click the activity card to navigate to it
        await activityCard.click();
        await page.waitForURL(/\/activities\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // StudentPreview renders "Estructura de Misión" sidebar
        await expect(page.getByRole("heading", { name: "Estructura de Misión" })).toBeVisible({ timeout: 10000 });

        // The phase is listed in the sidebar
        await expect(page.locator(`h3:has-text("Phase 1")`)).toBeVisible({ timeout: 10000 });

        // The step is listed and selected by default (first step auto-selected)
        await expect(page.locator(`[data-step-title="E2E Theory Step"]`)).toBeVisible({ timeout: 10000 });
    });
});
