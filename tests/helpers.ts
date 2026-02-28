import { createClient } from "@supabase/supabase-js";

export const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

export async function cleanupTestUsers() {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const { data: { users }, error: userListError } = await supabase.auth.admin.listUsers();

    if (!userListError && users) {
        for (const user of users) {
            if (user.email && user.email.startsWith("test-") && user.email.endsWith("@example.com")) {
                // Delete modules for this test user
                await supabase.from("modules").delete().eq("teacher_id", user.id);
                // Delete user
                await supabase.auth.admin.deleteUser(user.id);
                console.log(`[CLEANUP] Deleted test user and modules: ${user.email}`);
            }
        }
    }
}

export function generateTestEmail(prefix: string = "user"): string {
    return `test-${prefix}-${Date.now()}@example.com`;
}
