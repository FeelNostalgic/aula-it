import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { getSupabaseAdmin, generateTestEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let teacherId: string;
let teacherEmail: string;
let studentId: string;
let moduleId: string;
let unitId: string;
let activityId: string;
let phaseId: string;
let stepId: string;
let enrollmentId: string;
let submissionId: string;

const password = "password123";

test.describe("Teacher Grading Flow", () => {
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        // 1. Create Teacher
        teacherEmail = generateTestEmail("teacher-grading");
        const { data: teacherUser, error: tAuthError } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Teacher Grading", role: "teacher" },
        });
        if (tAuthError) throw new Error(`Teacher auth failed: ${tAuthError.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // 2. Create Student
        const studentEmail = generateTestEmail("student-grading");
        const { data: studentUser, error: sAuthError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Student Grading", role: "student" },
        });
        if (sAuthError) throw new Error(`Student auth failed: ${sAuthError.message}`);
        studentId = studentUser.user.id;
        await supabase.from("profiles").update({ role: "student", global_xp: 0 }).eq("id", studentId);

        // 3. Create Module
        const { data: module, error: modErr } = await supabase
            .from("modules")
            .insert({ name: "E2E Grading Module", teacher_id: teacherId, status: "active" })
            .select("id")
            .single();
        if (modErr) throw new Error(`Module insert failed: ${modErr.message}`);
        moduleId = module.id;

        // 4. Create Unit — must be 'published' for students; teachers can access any status
        const { data: unit, error: unitErr } = await supabase
            .from("units")
            .insert({ module_id: moduleId, name: "E2E Grading Unit", status: "published", order_index: 0 })
            .select("id")
            .single();
        if (unitErr) throw new Error(`Unit insert failed: ${unitErr.message}`);
        unitId = unit.id;

        // 5. Create Activity
        const { data: activity, error: actErr } = await supabase
            .from("activities")
            .insert({ unit_id: unitId, title: "E2E Grading Activity", type: "task", status: "published", order_index: 0 })
            .select("id")
            .single();
        if (actErr) throw new Error(`Activity insert failed: ${actErr.message}`);
        activityId = activity.id;

        // 6. Create Phase
        const { data: phase, error: phaseErr } = await supabase
            .from("activity_phases")
            .insert({ activity_id: activityId, title: "Grading Phase", order_index: 0 })
            .select("id")
            .single();
        if (phaseErr) throw new Error(`Phase insert failed: ${phaseErr.message}`);
        phaseId = phase.id;

        // 7. Create Step — type 'deliverable' so it appears in StepSubmissionsSection
        const { data: step, error: stepErr } = await supabase
            .from("activity_steps")
            .insert({ phase_id: phaseId, title: "E2E Deliverable Step", type: "deliverable", xp: 50, order_index: 0 })
            .select("id")
            .single();
        if (stepErr) throw new Error(`Step insert failed: ${stepErr.message}`);
        stepId = step.id;

        // 8. Enroll student
        const { data: enrollment, error: enrollErr } = await supabase
            .from("module_enrollments")
            .insert({ module_id: moduleId, student_id: studentId })
            .select("id")
            .single();
        if (enrollErr) throw new Error(`Enrollment insert failed: ${enrollErr.message}`);
        enrollmentId = enrollment.id;

        // 9. Insert a pending submission directly via Admin API so teacher has something to grade
        const { data: submission, error: subErr } = await supabase
            .from("activity_submissions")
            .insert({ student_id: studentId, step_id: stepId, status: "submitted" })
            .select("id")
            .single();
        if (subErr) throw new Error(`Submission insert failed: ${subErr.message}`);
        submissionId = submission.id;

        console.log("[teacher-grading] Setup complete.");
    });

    test.afterAll(async () => {
        if (!supabase) return;
        await supabase.from("activity_submissions").delete().eq("id", submissionId);
        await supabase.from("module_enrollments").delete().eq("id", enrollmentId);
        await supabase.from("activity_steps").delete().eq("id", stepId);
        await supabase.from("activity_phases").delete().eq("id", phaseId);
        await supabase.from("activities").delete().eq("id", activityId);
        await supabase.from("units").delete().eq("id", unitId);
        await supabase.from("modules").delete().eq("id", moduleId);
        await supabase.auth.admin.deleteUser(studentId);
        await supabase.auth.admin.deleteUser(teacherId);
    });

    test("teacher navigates to unit EVALUACIÓN tab and sees the student submission", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Teacher dashboard shows module
        const moduleCard = page.locator(`h3:has-text("E2E Grading Module")`).first();
        await expect(moduleCard).toBeVisible({ timeout: 10000 });
        await moduleCard.click();
        await page.waitForURL(/\/dashboard\/modules\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Module page shows units under "Unidades Didácticas"
        await expect(page.getByRole("heading", { name: "Unidades Didácticas" })).toBeVisible({ timeout: 10000 });

        // Click the unit
        const unitCard = page.locator(`h3:has-text("E2E Grading Unit")`).first();
        await expect(unitCard).toBeVisible({ timeout: 10000 });
        await unitCard.click();
        await page.waitForURL(/\/dashboard\/units\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Navigate to EVALUACIÓN tab
        await page.getByRole("tab", { name: "EVALUACIÓN" }).click();

        // The tab content renders "Evaluación de la Unidad" heading
        await expect(page.getByRole("heading", { name: "Evaluación de la Unidad" })).toBeVisible({ timeout: 10000 });

        // The activity selector pill loads asynchronously — wait for it
        const activityPill = page.locator(`button:has-text("E2E Grading Activity")`).first();
        await expect(activityPill).toBeVisible({ timeout: 15000 });

        // The first activity is auto-selected — the step table should appear directly
        await expect(page.locator(`text="E2E Deliverable Step"`)).toBeVisible({ timeout: 10000 });
    });

    test("teacher opens grading modal and grades the submission as completado", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(teacherEmail, password);
        await page.waitForURL(/\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Navigate to unit directly via URL
        await page.goto(`/dashboard/units/${unitId}`);
        await page.waitForURL(/\/dashboard\/units\//, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // Click EVALUACIÓN tab
        await page.getByRole("tab", { name: "EVALUACIÓN" }).click();

        // Wait for activity pill to appear (loads asynchronously)
        const activityPill = page.locator(`button:has-text("E2E Grading Activity")`).first();
        await expect(activityPill).toBeVisible({ timeout: 15000 });

        // First activity is auto-selected — step header appears directly, no accordion needed
        await expect(page.locator(`text="E2E Deliverable Step"`)).toBeVisible({ timeout: 10000 });

        // Click the "Evaluar" button for the submission row
        const evaluarBtn = page.getByRole("button", { name: "Evaluar" }).first();
        await expect(evaluarBtn).toBeVisible({ timeout: 5000 });
        await evaluarBtn.click();

        // GradingModal opens with "Evaluar entrega" title
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByRole("heading", { name: /Evaluar entrega/ })).toBeVisible();

        // Switch to "Completado" grading mode
        await dialog.getByRole("button", { name: "Completado" }).click();

        // The completado confirmation message should appear
        await expect(dialog.getByText("Esta entrega se marcará como completada sin nota numérica.")).toBeVisible();

        // Click "Guardar evaluación"
        await dialog.getByRole("button", { name: "Guardar evaluación" }).click();

        // Modal closes after save
        await expect(dialog).not.toBeVisible({ timeout: 10000 });

        // The submission row now shows "Corregido" status badge (graded → "Corregido")
        await expect(page.locator(`text="Corregido"`).first()).toBeVisible({ timeout: 10000 });
    });
});
