import { test, expect } from "@playwright/test";
import { getSupabaseAdmin, generateTestEmail } from "./helpers";

test.describe("Gamification: XP Award Trigger", () => {
    let supabase: any;
    let teacherId: string;
    let studentId: string;
    let moduleId: string;
    let unitId: string;
    let activityId: string;
    let stepId: string;
    let enrollmentId: string;

    test.beforeAll(async () => {
        supabase = getSupabaseAdmin();
        if (!supabase) throw new Error("Supabase admin client not available");

        // 1. Create Teacher
        const teacherEmail = generateTestEmail("teacher-xp");
        const { data: teacherUser, error: teacherError } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password: "password123",
            email_confirm: true,
            user_metadata: { role: "teacher" }
        });
        if (teacherError || !teacherUser?.user) throw new Error(`Failed to create teacher: ${teacherError?.message}`);
        teacherId = teacherUser.user.id;
        await supabase.from("profiles").update({ role: "teacher" }).eq("id", teacherId);

        // 2. Create Student
        const studentEmail = generateTestEmail("student-xp");
        const { data: studentUser, error: studentError } = await supabase.auth.admin.createUser({
            email: studentEmail,
            password: "password123",
            email_confirm: true,
            user_metadata: { role: "student" }
        });
        if (studentError || !studentUser?.user) throw new Error(`Failed to create student: ${studentError?.message}`);
        studentId = studentUser.user.id;

        // 3. Create Module
        const { data: module, error: moduleError } = await supabase.from("modules").insert({
            name: "XP Test Module",
            teacher_id: teacherId
        }).select("id").single();
        if (moduleError || !module) throw new Error(`Failed to create module: ${moduleError?.message}`);
        moduleId = module.id;

        // 4. Enroll Student
        const { data: enrollment, error: enrollmentError } = await supabase.from("module_enrollments").insert({
            module_id: moduleId,
            student_id: studentId
        }).select("id").single();
        if (enrollmentError || !enrollment) throw new Error(`Failed to create enrollment: ${enrollmentError?.message}`);
        enrollmentId = enrollment.id;

        // 5. Create Unit
        const { data: unit, error: unitError } = await supabase.from("units").insert({
            module_id: moduleId,
            name: "XP Test Unit"
        }).select("id").single();
        if (unitError || !unit) throw new Error(`Failed to create unit: ${unitError?.message}`);
        unitId = unit.id;

        // 6. Create Activity (No XP here anymore)
        const { data: activity, error: activityError } = await supabase.from("activities").insert({
            unit_id: unitId,
            title: "XP Test Activity",
            type: "task"
        }).select("id").single();
        if (activityError || !activity) throw new Error(`Failed to create activity: ${activityError?.message}`);
        activityId = activity.id;

        // 7. Create Phase and Step
        const { data: phase, error: phaseError } = await supabase.from("activity_phases").insert({
            activity_id: activityId,
            title: "Phase 1"
        }).select("id").single();
        if (phaseError || !phase) throw new Error(`Failed to create phase: ${phaseError?.message}`);

        const { data: step, error: stepError } = await supabase.from("activity_steps").insert({
            phase_id: phase.id,
            title: "Step 1",
            type: "deliverable",
            xp: 100
        }).select("id").single();
        if (stepError || !step) throw new Error(`Failed to create step: ${stepError?.message}`);
        stepId = step.id;
    });

    test.afterAll(async () => {
        if (!supabase) return;
        // Cleanup order: submissions -> enrollments -> steps -> phases -> activities -> units -> modules -> users
        await supabase.from("activity_submissions").delete().eq("student_id", studentId);
        await supabase.from("module_enrollments").delete().eq("id", enrollmentId);
        await supabase.from("activity_steps").delete().eq("id", stepId);
        await supabase.from("activity_phases").delete().eq("activity_id", activityId);
        await supabase.from("activities").delete().eq("id", activityId);
        await supabase.from("units").delete().eq("id", unitId);
        await supabase.from("modules").delete().eq("id", moduleId);
        await supabase.auth.admin.deleteUser(teacherId);
        await supabase.auth.admin.deleteUser(studentId);
    });

    test("should award XP to global profile and module enrollment when status changes to graded", async () => {
        // 1. Create a pending submission
        const { data: submission, error: subError } = await supabase.from("activity_submissions").insert({
            student_id: studentId,
            step_id: stepId,
            status: "pending"
        }).select("id").single();

        expect(subError).toBeNull();

        // 2. Verify initial XP is 0
        const { data: profileInitial, error: profileInitialError } = await supabase.from("profiles").select("global_xp").eq("id", studentId).single();
        const { data: enrollmentInitial, error: enrollmentInitialError } = await supabase.from("module_enrollments").select("module_xp").eq("id", enrollmentId).single();

        expect(profileInitialError, `profiles SELECT failed: ${JSON.stringify(profileInitialError)}`).toBeNull();
        expect(enrollmentInitialError, `module_enrollments SELECT failed (enrollmentId=${enrollmentId}): ${JSON.stringify(enrollmentInitialError)}`).toBeNull();
        expect(profileInitial!.global_xp).toBe(0);
        expect(enrollmentInitial!.module_xp).toBe(0);

        // 3. Update status to 'graded'
        const { error: updateError } = await supabase.from("activity_submissions")
            .update({ status: "graded" })
            .eq("id", submission.id);

        expect(updateError).toBeNull();

        // 4. Verify XP increased by 100
        // Wait a bit for trigger
        await new Promise(r => setTimeout(r, 1000));

        const { data: profileAfter, error: profileAfterError } = await supabase.from("profiles").select("global_xp").eq("id", studentId).single();
        const { data: enrollmentAfter, error: enrollmentAfterError } = await supabase.from("module_enrollments").select("module_xp").eq("id", enrollmentId).single();

        expect(profileAfterError, `profiles SELECT (after) failed: ${JSON.stringify(profileAfterError)}`).toBeNull();
        expect(enrollmentAfterError, `module_enrollments SELECT (after) failed: ${JSON.stringify(enrollmentAfterError)}`).toBeNull();
        expect(profileAfter!.global_xp).toBe(100);
        expect(enrollmentAfter!.module_xp).toBe(100);

        // 5. Update again (to graded again, should not increment)
        await supabase.from("activity_submissions")
            .update({ status: "graded", updated_at: new Date() })
            .eq("id", submission.id);

        await new Promise(r => setTimeout(r, 500));

        const { data: profileDouble, error: profileDoubleError } = await supabase.from("profiles").select("global_xp").eq("id", studentId).single();
        expect(profileDoubleError, `profiles SELECT (double) failed: ${JSON.stringify(profileDoubleError)}`).toBeNull();
        expect(profileDouble!.global_xp).toBe(100);
    });
});
