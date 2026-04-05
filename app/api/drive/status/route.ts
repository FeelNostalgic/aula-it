import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { DRIVE_CONNECTION_STATUS } from "@/lib/drive-connection-status";
import { getDriveConnectionStatus } from "@/lib/google-drive-api";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ connected: false, status: DRIVE_CONNECTION_STATUS.DISCONNECTED });
    }

    const admin = createAdminClient();
    const { data } = await admin
        .from("teacher_drive_tokens")
        .select("refresh_token")
        .eq("teacher_id", user.id)
        .single();

    if (!data?.refresh_token) {
        return NextResponse.json({
            connected: false,
            status: DRIVE_CONNECTION_STATUS.DISCONNECTED,
        });
    }

    const status = await getDriveConnectionStatus(data.refresh_token);
    return NextResponse.json({
        connected: status === DRIVE_CONNECTION_STATUS.CONNECTED,
        status,
    });
}
