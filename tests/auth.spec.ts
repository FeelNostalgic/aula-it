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

    // Cleanup modules first (due to foreign key)
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
  const testEmail = `test-student-${Date.now()}@example.com`;
  await page.goto("/register");

  await page.fill('input[name="name"]', "Test Student");
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', "password123");

  await page.click('button:has-text("CREATE ACCOUNT")');

  await expect(page).toHaveURL(/\/dashboard/);
  // Un alumno ve el panel de progreso, no el de "Módulos que impartes"
  await expect(page.locator("h2")).toContainText("Módulos Activos");
});

test("debe permitir a un profesor crear un módulo", async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseKey) {
    console.warn("Skipping teacher test: SUPABASE_SERVICE_ROLE_KEY not set");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const testEmail = `test-teacher-${Date.now()}@example.com`;
  const password = "password123";

  // 1. Crear usuario con rol profesor usando Admin API
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: "Test Teacher",
      role: "teacher"
    }
  });

  if (createError || !user) throw new Error(`Could not create teacher: ${createError?.message}`);

  // 2. Login
  await page.goto("/login");
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("SIGN IN")');

  // 3. Verificar Dashboard de profesor
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("h2")).toContainText("Módulos que impartes");

  // 4. Crear módulo
  await page.click('button:has-text("CREATE NEW MODULE")');

  // Esperar a que el dialog sea visible
  const dialog = page.locator('div[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('input[name="name"]').fill("Playwright Module");
  await dialog.locator('input[name="description"]').fill("Created by E2E Test");

  // Click en el botón de submit dentro del form
  await dialog.locator('button:has-text("CREATE MODULE")').click();

  // 5. Verificar que aparece en la lista (grid por defecto)
  await expect(page.locator("text=Playwright Module")).toBeVisible();
});

