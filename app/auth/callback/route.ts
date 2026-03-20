import { NextResponse } from "next/server";
// The client you created in Step 2
import { createClient } from "@/utils/supabase/server";

function buildRedirectUrl(origin: string, forwardedHost: string | null, path: string): string {
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) return `${origin}${path}`;
  if (forwardedHost) return `https://${forwardedHost}${path}`;
  return `${origin}${path}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "student") {
          await supabase.auth.signOut();
          return NextResponse.redirect(buildRedirectUrl(origin, forwardedHost, "/login/teacher?error=unauthorized"));
        }

        if (profile?.role === "admin") {
          return NextResponse.redirect(buildRedirectUrl(origin, forwardedHost, "/admin"));
        }
      }

      return NextResponse.redirect(buildRedirectUrl(origin, forwardedHost, next));
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
