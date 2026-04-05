import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAuthorizeUrl } from "@/lib/google-drive-api";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Solo profesores pueden conectar Drive" }, { status: 403 });
    }

    const url = getAuthorizeUrl(user.id, new URL(request.url).origin);
    return NextResponse.redirect(url);
}
