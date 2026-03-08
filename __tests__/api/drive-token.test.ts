import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { GET } from "@/app/api/drive/token/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

// ─── googleapis mock ──────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so any variables
// referenced inside the factory must also be hoisted via vi.hoisted().

const { mockRefreshAccessToken, MockOAuth2 } = vi.hoisted(() => {
  const mockRefreshAccessToken = vi.fn();
  // Must use a real `function` (not an arrow) so `new MockOAuth2(...)` works.
  function MockOAuth2(this: unknown) {
    return {
      setCredentials: vi.fn(),
      refreshAccessToken: mockRefreshAccessToken,
    };
  }
  return { mockRefreshAccessToken, MockOAuth2 };
});

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: MockOAuth2,
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FUTURE_EXPIRES_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h ahead
const PAST_EXPIRES_AT = new Date(Date.now() - 60 * 1000).toISOString();        // 1m ago

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/drive/token", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("returns 403 when authenticated user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth({ id: "student-456", email: "student@example.com" })
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Solo profesores" });
  });

  it("returns 400 when no Drive token row exists for the teacher", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "teacher-123", email: "teacher@example.com" })
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Drive no conectado" });
  });

  it("returns the existing access_token when the token is still valid", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "teacher-123", email: "teacher@example.com" })
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const tokenRow = {
      access_token: "existing-access-token",
      refresh_token: "refresh-xyz",
      expires_at: FUTURE_EXPIRES_AT,
    };
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: tokenRow, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ access_token: "existing-access-token" });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("refreshes and returns a new access_token when the token is expired", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "teacher-123", email: "teacher@example.com" })
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const tokenRow = {
      access_token: "stale-access-token",
      refresh_token: "refresh-xyz",
      expires_at: PAST_EXPIRES_AT,
    };
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: tokenRow, error: null })
      .mockUpdate("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    mockRefreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: "new-access-token",
        expiry_date: Date.now() + 3600 * 1000,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ access_token: "new-access-token" });
    expect(mockRefreshAccessToken).toHaveBeenCalledOnce();
  });

  it("returns 401 when the token refresh fails", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "teacher-123", email: "teacher@example.com" })
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const tokenRow = {
      access_token: "stale-access-token",
      refresh_token: "refresh-xyz",
      expires_at: PAST_EXPIRES_AT,
    };
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: tokenRow, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    mockRefreshAccessToken.mockRejectedValue(new Error("Token revoked"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "Token expirado. Reconecta Google Drive en Configuración.",
    });
  });
});
