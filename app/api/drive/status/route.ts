import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ connected: false });
    }

    const admin = createAdminClient();
    const { data } = await admin
        .from("teacher_drive_tokens")
        .select("id")
        .eq("teacher_id", user.id)
        .single();

    return NextResponse.json({ connected: !!data });
}
