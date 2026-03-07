import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { createAdminClient } from "@/utils/supabase/admin";
import { BreadcrumbProvider } from "@/components/dashboard/breadcrumb-context";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, google_email")
        .eq("id", user.id)
        .single();

    const userAvatar = user.user_metadata?.avatar_url || "";
    // Format ID: Take last 8 chars of UUID and uppercase it for a "tactical" look
    const userId = `ID: ${user.id.slice(-8).toUpperCase()}`;

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
        <BreadcrumbProvider>
            <SettingsClient
                userEmail={user.email ?? ""}
                initialFullName={profile?.full_name ?? ""}
                initialGoogleEmail={profile?.google_email ?? ""}
                userAvatar={userAvatar}
                userId={user.id}
                isTeacher={isTeacher}
                driveConnected={driveConnected}
            />
        </BreadcrumbProvider>
    );
}
