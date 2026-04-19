import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-drive-api";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const teacherId = searchParams.get("state");

    if (!code || !teacherId) {
        return NextResponse.redirect(new URL("/dashboard?drive=error", request.url));
    }

    try {
        const tokens = await exchangeCodeForTokens(code, new URL(request.url).origin);

        if (!tokens.access_token || !tokens.expiry_date) {
            return NextResponse.redirect(new URL("/dashboard?drive=error", request.url));
        }

        const supabase = createAdminClient();
        let refreshToken = tokens.refresh_token ?? null;

        if (!refreshToken) {
            const { data: existingTokenRow } = await supabase
                .from("teacher_drive_tokens")
                .select("refresh_token")
                .eq("teacher_id", teacherId)
                .maybeSingle();

            refreshToken = existingTokenRow?.refresh_token ?? null;
        }

        if (!refreshToken) {
            return NextResponse.redirect(new URL("/dashboard?drive=error", request.url));
        }

        const { error } = await supabase
            .from("teacher_drive_tokens")
            .upsert(
                {
                    teacher_id: teacherId,
                    access_token: tokens.access_token,
                    refresh_token: refreshToken,
                    expires_at: new Date(tokens.expiry_date).toISOString(),
                },
                { onConflict: "teacher_id" }
            );

        if (error) throw error;

        return NextResponse.redirect(new URL("/dashboard?drive=connected", request.url));
    } catch (err) {
        console.error("[drive/callback]", err);
        return NextResponse.redirect(new URL("/dashboard?drive=error", request.url));
    }
}
