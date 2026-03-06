import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, google_email")
        .eq("id", user.id)
        .single();

    const isTeacher = profile?.role === "teacher";

    // Check Drive connection status for teachers
    let driveConnected = false;
    if (isTeacher) {
        const admin = createAdminClient();
        const { data: tokenRow } = await admin
            .from("teacher_drive_tokens")
            .select("id")
            .eq("teacher_id", user.id)
            .single();
        driveConnected = !!tokenRow;
    }

    return (
        <SettingsClient
            userEmail={user.email ?? ""}
            initialFullName={profile?.full_name ?? ""}
            initialGoogleEmail={profile?.google_email ?? ""}
            isTeacher={isTeacher}
            driveConnected={driveConnected}
        />
    );
}
