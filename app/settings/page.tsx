import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { createAdminClient } from "@/utils/supabase/admin";
import { BreadcrumbProvider } from "@/components/dashboard/layout/breadcrumb-context";
import { DRIVE_CONNECTION_STATUS, type DriveConnectionStatus } from "@/lib/drive-connection-status";
import { DRIVE_STORAGE_MODE, normalizeDriveStorageSettings } from "@/lib/drive-storage-settings";
import { getDriveClient, getDriveConnectionStatus, resolveDriveStorageRootFolderMetadata } from "@/lib/google-drive-api";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Perfil",
};

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, google_email, is_private, global_xp, streak_days")
        .eq("id", user.id)
        .single();

    const userAvatar = user.user_metadata?.avatar_url || "";
    const isTeacher = profile?.role === "teacher";

    // Fetch student-only stats (only for students)
    let earnedBadgesCount = 0;
    let activeSubmissionsCount = 0;
    let badges: {
        id: string;
        name: string;
        description: string | null;
        iconUrl: string | null;
        unlocked: boolean;
        progress: number;
    }[] = [];

    if (!isTeacher) {
        const admin = createAdminClient();

        const [{ count: badgeCount }, { count: submissionsCount }, { data: allClassBadges }, { data: earnedStudentBadges }] = await Promise.all([
            admin
                .from("student_badges")
                .select("*", { count: "exact", head: true })
                .eq("student_id", user.id),
            admin
                .from("activity_submissions")
                .select("*", { count: "exact", head: true })
                .eq("student_id", user.id)
                .neq("status", "graded"),
            admin
                .from("class_badges")
                .select("id, title, description, icon_url")
                .eq("is_hidden", false),
            admin
                .from("student_badges")
                .select("badge_id")
                .eq("student_id", user.id),
        ]);

        earnedBadgesCount = badgeCount ?? 0;
        activeSubmissionsCount = submissionsCount ?? 0;
        
        const earnedSet = new Set((earnedStudentBadges ?? []).map(b => b.badge_id));
        
        badges = (allClassBadges ?? []).map(cb => ({
            id: cb.id,
            name: cb.title,
            description: cb.description,
            iconUrl: cb.icon_url,
            unlocked: earnedSet.has(cb.id),
            progress: earnedSet.has(cb.id) ? 100 : 0, // In the future, this can be calculated from conditions
        }));
    }

    // Check Drive connection status for teachers
    let driveStatus: DriveConnectionStatus = DRIVE_CONNECTION_STATUS.DISCONNECTED;
    let driveStorageSettings = normalizeDriveStorageSettings();
    if (isTeacher) {
        const admin = createAdminClient();
        const [{ data: tokenRow }, { data: appSettingsRow }] = await Promise.all([
            admin
                .from("teacher_drive_tokens")
                .select("refresh_token")
                .eq("teacher_id", user.id)
                .single(),
            admin
                .from("app_settings")
                .select("drive_storage_mode, drive_root_folder_id, drive_root_folder_name, drive_root_folder_url")
                .eq("teacher_id", user.id)
                .maybeSingle(),
        ]);
        driveStatus = await getDriveConnectionStatus(tokenRow?.refresh_token ?? null);
        driveStorageSettings = normalizeDriveStorageSettings(appSettingsRow);

        if (
            driveStatus === DRIVE_CONNECTION_STATUS.CONNECTED
            && tokenRow?.refresh_token
            && driveStorageSettings.mode === DRIVE_STORAGE_MODE.AUTO_ROOT
        ) {
            try {
                const driveClient = getDriveClient(tokenRow.refresh_token);
                const rootFolder = await resolveDriveStorageRootFolderMetadata(driveClient, driveStorageSettings);
                driveStorageSettings = {
                    ...driveStorageSettings,
                    folderId: rootFolder.id,
                    folderName: rootFolder.name,
                    folderUrl: rootFolder.url,
                };
            } catch (error) {
                console.error("[settings/page] could not resolve automatic drive root", error);
            }
        }
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
                driveStorageSettings={driveStorageSettings}
                globalXp={profile?.global_xp ?? 0}
                streakDays={profile?.streak_days ?? 0}
                earnedBadgesCount={earnedBadgesCount}
                activeSubmissionsCount={activeSubmissionsCount}
                badges={badges}
            />
        </BreadcrumbProvider>
    );
}
