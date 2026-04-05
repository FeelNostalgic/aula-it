import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createGoogleOAuth2Client } from "@/lib/google-oauth";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Solo profesores" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("refresh_token, access_token, expires_at")
        .eq("teacher_id", user.id)
        .single();

    if (!tokenRow) {
        return NextResponse.json({ error: "Drive no conectado" }, { status: 400 });
    }

    // Return existing token if still valid (5-min buffer)
    const expiresAt = new Date(tokenRow.expires_at).getTime();
    const BUFFER_MS = 5 * 60 * 1000;
    if (expiresAt - Date.now() > BUFFER_MS) {
        return NextResponse.json({ access_token: tokenRow.access_token });
    }

    // Refresh token
    const auth = createGoogleOAuth2Client();
    auth.setCredentials({ refresh_token: tokenRow.refresh_token });

    try {
        const { credentials } = await auth.refreshAccessToken();
        const newAccessToken = credentials.access_token!;
        const newExpiresAt = new Date(credentials.expiry_date!).toISOString();

        await admin
            .from("teacher_drive_tokens")
            .update({ access_token: newAccessToken, expires_at: newExpiresAt })
            .eq("teacher_id", user.id);

        return NextResponse.json({ access_token: newAccessToken });
    } catch (err: any) {
        console.error("[drive/token] refresh failed:", err);
        return NextResponse.json(
            { error: "Token expirado. Reconecta Google Drive en Configuración." },
            { status: 401 }
        );
    }
}
