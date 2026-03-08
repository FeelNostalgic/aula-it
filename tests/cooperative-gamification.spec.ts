import { test, expect } from "@playwright/test";
import { getSupabaseAdmin, generateTestEmail } from "./helpers";

test.describe("Cooperative Gamification: Milestone Progress", () => {
    let supabase: any;
    let studentId: string;
    let teacherId: string;
    let milestoneId: string;
    let stepId: string;

    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        console.log("Setting up Cooperative Gamification Test...");

        // 1. Create Teacher (needed for module ownership)
        const teacherEmail = generateTestEmail("teacher-coop");
        const { data: teacherUser, error: tAuthError } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password: "password123",
            email_confirm: true,
            user_metadata: { role: "teacher" }
        });
        if (tAuthError) throw new Error(`Teacher Auth failed: ${tAuthError.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // 2. Create Student
        const studentEmail = generateTestEmail("student-coop-v4");
        const { data: studentUser, error: sAuthError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password: "password123",
            email_confirm: true,
            user_metadata: { role: "student" }
        });
        if (sAuthError) throw new Error(`Student Auth failed: ${sAuthError.message}`);
        studentId = studentUser.user.id;
        await supabase.from("profiles").update({ role: "student", global_xp: 0 }).eq("id", studentId);

        // 3. Create structural data first (needed for milestone link)
        const { data: module, error: modErr } = await supabase.from("modules").insert({
            name: "Coop Module",
            teacher_id: teacherId,
            status: "active"
        }).select("id").single();
        if (modErr) throw new Error(`Module insert failed: ${modErr.message}`);

        const { data: unit, error: unitErr } = await supabase.from("units").insert({
            module_id: module.id,
            name: "Coop Unit"
        }).select("id").single();
        if (unitErr) throw new Error(`Unit insert failed: ${unitErr.message}`);

        // 4. Ensure an active milestone exists for THIS unit
        await supabase.from("class_milestones").update({ status: "archived" }).eq("unit_id", unit.id).eq("status", "active");

        const { data: milestone, error: milestoneError } = await supabase.from("class_milestones").insert({
            title: "Test Mega Milestone",
            unit_id: unit.id,
            target_points: 1000,
            current_points: 0,
            reward: "Pizza Party",
            status: "active"
        }).select("id").single();

        if (milestoneError) throw new Error(`Milestone insert failed: ${milestoneError.message}`);
        milestoneId = milestone.id;

        // 5. Create activity chain
        const { data: activity, error: actErr } = await supabase.from("activities").insert({ unit_id: unit.id, title: "Coop Activity", type: "theory" }).select("id").single();
        if (actErr) throw new Error(`Activity insert failed: ${actErr.message}`);

        const { data: phase, error: phaseErr } = await supabase.from("activity_phases").insert({
            activity_id: activity.id,
            title: "Phase 1"
        }).select("id").single();
        if (phaseErr) throw new Error(`Phase insert failed: ${phaseErr.message}`);

        const { data: step, error: stepErr } = await supabase.from("activity_steps").insert({
            phase_id: phase.id,
            title: "Coop Step",
            type: "theory",
            xp: 50
        }).select("id").single();
        if (stepErr) throw new Error(`Step insert failed: ${stepErr.message}`);
        stepId = step.id;

        // Enroll
        await supabase.from("module_enrollments").insert({ module_id: module.id, student_id: studentId });
        console.log("Setup complete!");
    });

    test("should increment active milestone points when student earns XP", async () => {
        // 1. Create a pending submission
        const { data: submission, error: subError } = await supabase.from("activity_submissions").insert({
            student_id: studentId,
            step_id: stepId,
            status: "pending"
        }).select("id").single();
        if (subError) throw new Error(`Submission insert failed: ${subError.message}`);

        // 2. Set to graded
        const { error: gradeError } = await supabase.from("activity_submissions").update({ status: "graded" }).eq("id", submission.id);
        if (gradeError) throw new Error(`Grading update failed: ${gradeError.message}`);

        // 3. Verify milestone increment
        // Trigger is async, wait a bit
        await new Promise(r => setTimeout(r, 2500));

        const { data: milestoneAfter, error: fetchError } = await supabase.from("class_milestones").select("current_points").eq("id", milestoneId).single();
        if (fetchError) throw new Error(`Milestone fetch failed: ${fetchError.message}`);

        expect(milestoneAfter.current_points).toBeGreaterThanOrEqual(50);
    });
});
