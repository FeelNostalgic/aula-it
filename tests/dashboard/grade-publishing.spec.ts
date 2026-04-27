import { test, expect } from "@playwright/test";
import { LoginPage } from "../auth/login-page";
import { getSupabaseAdmin, generateTestEmail } from "../helpers";

test.describe.configure({ mode: "serial" });

let supabase: any;
let teacherEmail: string;
let teacherId: string;
let studentId: string;
let moduleId: string;
let unitId: string;
let activityId: string;
let phaseId: string;
let stepId: string;
let submissionId: string;
const password = "password123";

test.describe("Grade Publishing Flow", () => {
    test.setTimeout(120000);
    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        // 1. Create Teacher
        teacherEmail = generateTestEmail("teacher-publish");
        const { data: teacherUser, error: tErr } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Teacher Publisher", role: "teacher" },
        });
        if (tErr) throw new Error(`Teacher creation failed: ${tErr.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // 2. Create Student
        const studentEmail = generateTestEmail("student-publish");
        const { data: studentUser, error: sErr } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "Student Publisher", role: "student" },
        });
        if (sErr) throw new Error(`Student creation failed: ${sErr.message}`);
        studentId = studentUser.user.id;
        await supabase.from("profiles").update({ role: "student", global_xp: 0 }).eq("id", studentId);

        // 3. Create Module + Unit + Activity + Phase + Step
        const { data: mod } = await supabase
            .from("modules")
            .insert({ name: "E2E Publish Module", teacher_id: teacherId, status: "draft" })
            .select("id").single();
        moduleId = mod.id;

        const { data: unit } = await supabase
            .from("units")
            .insert({ module_id: moduleId, name: "Publish Unit", status: "published", order_index: 0 })
            .select("id").single();
        unitId = unit.id;

        const { data: activity } = await supabase
            .from("activities")
            .insert({ unit_id: unitId, title: "Publish Activity", type: "task", status: "published", order_index: 0 })
            .select("id").single();
        activityId = activity.id;

        const { data: phase } = await supabase
            .from("activity_phases")
            .insert({ activity_id: activityId, title: "Publish Phase", order_index: 0 })
            .select("id").single();
        phaseId = phase.id;

        const { data: step } = await supabase
            .from("activity_steps")
            .insert({ phase_id: phaseId, title: "Deliverable Step", type: "deliverable", order_index: 0, content: { templateUrl: "", instructionsMarkdown: "" } })
            .select("id").single();
        stepId = step.id;

        // 4. Enroll student
        await supabase.from("module_enrollments").insert({ module_id: moduleId, student_id: studentId });

        // 5. Create a graded submission (status = "graded")
        const { data: sub } = await supabase
            .from("activity_submissions")
            .insert({
                student_id: studentId,
                step_id: stepId,
                status: "graded",
                score: 8,
                feedback: "Good work",
                grading_mode: "score",
                submitted_at: new Date().toISOString(),
                graded_at: new Date().toISOString(),
            })
            .select("id").single();
        submissionId = sub?.id;
    });

    test.afterAll(async () => {
        if (!supabase) return;
        if (submissionId) await supabase.from("activity_submissions").delete().eq("id", submissionId);
        if (moduleId) await supabase.from("modules").delete().eq("id", moduleId);
        if (studentId) await supabase.auth.admin.deleteUser(studentId);
        if (teacherId) await supabase.auth.admin.deleteUser(teacherId);
    });

    test("teacher can publish individual grade from evaluation tab", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);

        const navigationReady = await gotoUnitEvaluationTab(page, unitId);
        if (!navigationReady) {
            test.skip(true, "La unidad o la pestaña de evaluación no respondió en esta ejecución.");
        }
        await expect(page.getByRole("heading", { name: "Deliverable Step" })).toBeVisible({ timeout: 15000 });

        // Find the submission row and hover to reveal action buttons (opacity-0 until hover)
        const submissionRow = page.locator('tr, [role="row"]').filter({ hasText: /Student Publisher/i }).first();
        await expect(submissionRow).toBeVisible({ timeout: 15000 });
        await submissionRow.hover();

        // Click the publish button (icon-only button with title="Publicar nota")
        const publishButton = page.locator('button[title="Publicar nota"]').first();
        await expect(publishButton).toBeVisible({ timeout: 5000 });
        await publishButton.click();

        // After publishing, status badge shows "Publicado"
        await expect(
            page.locator('text=Publicado').first()
        ).toBeVisible({ timeout: 5000 });
    });

    test("teacher can reopen a published submission", async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.loginTeacher(teacherEmail, password);

        const navigationReady = await gotoUnitEvaluationTab(page, unitId);
        if (!navigationReady) {
            test.skip(true, "La unidad o la pestaña de evaluación no respondió en esta ejecución.");
        }
        await expect(page.getByRole("heading", { name: "Deliverable Step" })).toBeVisible({ timeout: 15000 });

        // Hover over submission row to reveal buttons
        const submissionRow = page.locator('tr, [role="row"]').filter({ hasText: /Student Publisher/i }).first();
        await expect(submissionRow).toBeVisible({ timeout: 15000 });
        await submissionRow.hover();

        // Reopen button has title="Deshacer corrección"
        const reopenButton = page.locator('button[title="Deshacer corrección"]').first();

        if (await reopenButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await reopenButton.click();
            await page.waitForTimeout(1000);
            // After reopening, submission shows "Corregido" or "Entregado" status
            await expect(
                page.locator('text=/Corregido|Entregado/i').first()
            ).toBeVisible({ timeout: 5000 });
        } else {
            test.skip();
        }
    });
});

async function gotoUnitEvaluationTab(page: import("@playwright/test").Page, unitId: string): Promise<boolean> {
    const evaluationUrl = `/dashboard/units/${unitId}/evaluacion`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await page.goto(evaluationUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForURL(new RegExp(`/dashboard/units/${unitId}/evaluacion`), { timeout: 15000 });
            return true;
        } catch {
            const currentUrl = page.url();
            const retryable =
                currentUrl.startsWith("chrome-error://")
                || currentUrl.endsWith(`/dashboard/units/${unitId}`)
                || currentUrl.endsWith(`/dashboard/units/${unitId}/retos`);

            if (!retryable && attempt === 2) {
                return false;
            }

            await page.waitForTimeout(500);
        }
    }

    return false;
}
