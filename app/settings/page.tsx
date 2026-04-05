import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { createAdminClient } from "@/utils/supabase/admin";
import { BreadcrumbProvider } from "@/components/dashboard/layout/breadcrumb-context";
import { DRIVE_CONNECTION_STATUS, type DriveConnectionStatus } from "@/lib/drive-connection-status";
import { getDriveConnectionStatus } from "@/lib/google-drive-api";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, google_email, is_private")
        .eq("id", user.id)
        .single();

    const userAvatar = user.user_metadata?.avatar_url || "";
    // Format ID: Take last 8 chars of UUID and uppercase it for a "tactical" look
    const userId = `ID: ${user.id.slice(-8).toUpperCase()}`;

    const isTeacher = profile?.role === "teacher";

    // Check Drive connection status for teachers
    let driveStatus: DriveConnectionStatus = DRIVE_CONNECTION_STATUS.DISCONNECTED;
    if (isTeacher) {
        const admin = createAdminClient();
        const { data: tokenRow } = await admin
            .from("teacher_drive_tokens")
            .select("refresh_token")
            .eq("teacher_id", user.id)
            .single();
        driveStatus = await getDriveConnectionStatus(tokenRow?.refresh_token ?? null);
    }

    return (
        <BreadcrumbProvider>
            <SettingsClient
                userEmail={user.email ?? ""}
                initialFullName={profile?.full_name ?? ""}
                initialGoogleEmail={profile?.google_email ?? ""}
                initialIsPrivate={profile?.is_private ?? false}
                userAvatar={userAvatar}
                userId={user.id}
                isTeacher={isTeacher}
                driveStatus={driveStatus}
            />
        </BreadcrumbProvider>
    );
}
