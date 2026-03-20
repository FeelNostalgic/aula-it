import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { login, logout, loginWithGoogle, signup } from "@/app/(auth)/login/actions";
import { createTeacher } from "@/app/admin/actions";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { RedirectError } from "../setup";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

// ─── login ────────────────────────────────────────────────────────────────────

describe("login()", () => {
  it("returns error when email is missing", async () => {
    const { client } = new SupabaseMockBuilder().build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ password: "secret123" });
    const result = await login(null, formData);

    expect(result).toEqual({ error: "Identificador/email y contraseña son obligatorios" });
  });

  it("returns error when password is missing", async () => {
    const { client } = new SupabaseMockBuilder().build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ email: "user@example.com" });
    const result = await login(null, formData);

    expect(result).toEqual({ error: "Identificador/email y contraseña son obligatorios" });
  });

  it("returns error when Supabase signInWithPassword fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockSignIn({ data: null, error: { message: "Invalid login credentials" } })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ email: "user@example.com", password: "wrongpass" });
    const result = await login(null, formData);

    expect(result).toEqual({ error: "Invalid login credentials" });
  });

  it("calls signInWithPassword and redirects to /dashboard on success", async () => {
    const { client, spies } = new SupabaseMockBuilder()
      .mockSignIn({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ email: "user@example.com", password: "correct123" });

    try {
      await login(null, formData);
      expect.unreachable("Should have thrown RedirectError");
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe("/dashboard");
    }

    expect(spies.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "correct123",
    });
  });
});

// ─── signup ───────────────────────────────────────────────────────────────────

describe("signup()", () => {
  it("siempre devuelve error: registro público deshabilitado", async () => {
    const formData = createFormData({ name: "X", email: "x@example.com", password: "pass1234" });
    const result = await signup(null, formData);
    expect(result).toEqual({
      error: "El registro público está deshabilitado. Contacta con el administrador del sistema.",
    });
  });
});

// ─── createTeacher ────────────────────────────────────────────────────────────

describe("createTeacher()", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ name: "Prof. Test", email: "prof@test.com", password: "pass1234" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when required fields are missing", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth({ id: "admin-id", email: "admin@school.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    // requireAdmin usa createAdminClient para leer el perfil
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          }),
        }),
      }),
    } as any);

    const formData = createFormData({ email: "prof@test.com" }); // missing name + password
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "Nombre, email y contraseña son obligatorios" });
  });

  it("creates teacher and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth({ id: "admin-id", email: "admin@school.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "new-teacher-id" } },
            error: null,
          }),
        },
      },
      // from() sirve tanto para requireAdmin (select) como para createTeacher (update)
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

    const formData = createFormData({ name: "Prof. Test", email: "prof@test.com", password: "securePass1" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ success: true });
    expect(mockAdminClient.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "prof@test.com" })
    );
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe("logout()", () => {
  it("calls signOut and redirects to /login", async () => {
    const { client, spies } = new SupabaseMockBuilder()
      .mockSignOut({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    try {
      await logout();
      expect.unreachable("Should have thrown RedirectError");
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe("/login");
    }

    expect(spies.auth.signOut).toHaveBeenCalledOnce();
  });
});

// ─── loginWithGoogle ──────────────────────────────────────────────────────────

describe("loginWithGoogle()", () => {
  it("calls signInWithOAuth with google provider and redirects to the OAuth URL", async () => {
    const oauthUrl = "https://accounts.google.com/o/oauth2/auth?some=params";
    const { client, spies } = new SupabaseMockBuilder()
      .mockOAuth({ data: { url: oauthUrl, provider: "google" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    try {
      await loginWithGoogle();
      expect.unreachable("Should have thrown RedirectError");
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe(oauthUrl);
    }

    expect(spies.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
  });

  it("returns error when signInWithOAuth fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockOAuth({ data: null, error: { message: "OAuth provider error" } })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await loginWithGoogle();

    expect(result).toEqual({ error: "OAuth provider error" });
  });
});
