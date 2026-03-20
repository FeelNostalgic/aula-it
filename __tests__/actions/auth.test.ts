import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { login, logout, loginWithGoogle, signup } from "@/app/(auth)/login/actions";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { RedirectError } from "../setup";

vi.mock("@/utils/supabase/server");

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
  it("returns error when required fields are missing", async () => {
    const { client } = new SupabaseMockBuilder().build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({ email: "user@example.com" }); // missing name + password
    const result = await signup(null, formData);

    expect(result).toEqual({ error: "Nombre, email y contraseña son obligatorios" });
  });

  it("returns error when Supabase signUp fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockSignUp({ data: null, error: { message: "Email already registered" } })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "pass1234",
    });
    const result = await signup(null, formData);

    expect(result).toEqual({ error: "Email already registered" });
  });

  it("calls signUp with correct metadata and redirects to /dashboard on success", async () => {
    const { client, spies } = new SupabaseMockBuilder()
      .mockSignUp({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const formData = createFormData({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "pass1234",
    });

    try {
      await signup(null, formData);
      expect.unreachable("Should have thrown RedirectError");
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe("/dashboard");
    }

    expect(spies.auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "pass1234",
      options: {
        data: {
          full_name: "Ada Lovelace",
          role: "student",
        },
      },
    });
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
