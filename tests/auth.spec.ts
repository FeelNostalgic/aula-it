import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.afterAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (!error && users) {
      for (const user of users) {
        if (user.email && user.email.startsWith("test-") && user.email.endsWith("@example.com")) {
          await supabase.auth.admin.deleteUser(user.id);
          console.log(`[CLEANUP] Deleted test user: ${user.email}`);
        }
      }
    }
  } else {
    console.warn("Skipping test user cleanup: SUPABASE_SERVICE_ROLE_KEY not set");
  }
});

test("debe mostrar la página de login", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toContainText("Aula IT");
});

test("debe permitir ingresar credenciales", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await expect(page.locator('button:has-text("SIGN IN")')).toBeVisible();
});

test("debe redirigir al login si no hay sesión en el dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  // Debe ser redirigido a /login por el proxy.ts
  await expect(page).toHaveURL(/\/login/);
});

test("debe permitir registrar un nuevo usuario", async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  await page.goto("/register");

  await page.fill('input[name="name"]', "Test User");
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', "password123");

  await page.click('button:has-text("CREATE ACCOUNT")');

  // Como el usuario desactivó la confirmación de email, 
  // el registro debería redirigir directamente al dashboard
  await expect(page).toHaveURL(/\/dashboard/);
});
