import { test, expect } from "@playwright/test";
import { LoginPage } from "./auth/login-page";
import { generateTestEmail, getSupabaseAdmin } from "./helpers";

// Run tests serially — they share a single seeded teacher user
test.describe.configure({ mode: "serial" });

let teacherEmail: string;
let teacherUserId: string;
const password = "password123";

test.describe("Sign Out", () => {
    test.beforeAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase) return;

        teacherEmail = generateTestEmail("signout-teacher");

        const { data: { user }, error } = await supabase.auth.admin.createUser({
            email: teacherEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: "SignOut Teacher", role: "teacher" },
        });
        if (error || !user) throw new Error(`Could not create teacher: ${error?.message}`);
        teacherUserId = user.id;

        await supabase.from("profiles").update({ role: "teacher" }).eq("id", user.id);
    });

    test.afterAll(async () => {
        const supabase = getSupabaseAdmin();
        if (!supabase || !teacherUserId) return;
        await supabase.auth.admin.deleteUser(teacherUserId);
    });

    test(
        "el profesor puede cerrar sesión y es redirigido a /login",
        { tag: ["@critical", "@e2e", "@sign-out", "@SIGNOUT-E2E-001"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            // Open the user nav dropdown — click the avatar/profile trigger
            await page.getByTestId("user-nav-trigger").click();

            // Click the "Cerrar sesión" button inside the dropdown
            await page.getByRole("button", { name: "Cerrar sesión" }).click();

            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        }
    );

    test(
        "tras cerrar sesión, navegar a /dashboard redirige a /login",
        { tag: ["@critical", "@e2e", "@sign-out", "@SIGNOUT-E2E-002"] },
        async ({ page }) => {
            if (!teacherUserId) { test.skip(); return; }

            const supabase = getSupabaseAdmin();
            if (!supabase) { test.skip(); return; }

            const loginPage = new LoginPage(page);

            await loginPage.login(teacherEmail, password);
            await page.waitForURL(/\/dashboard/, { timeout: 15000 });
            await page.waitForLoadState("networkidle");

            // Sign out via dropdown
            await page.getByTestId("user-nav-trigger").click();
            await page.getByRole("button", { name: "Cerrar sesión" }).click();
            await page.waitForURL(/\/login/, { timeout: 15000 });

            // Now try to navigate to /dashboard — should redirect back to /login
            await page.goto("/dashboard");
            await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
        }
    );
});
