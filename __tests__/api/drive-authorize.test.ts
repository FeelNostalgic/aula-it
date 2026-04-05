import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { getAuthorizeUrl } from "@/lib/google-drive-api";
import { GET } from "@/app/api/drive/authorize/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/server");

describe("GET /api/drive/authorize", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await GET(new Request("http://localhost/api/drive/authorize"));
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

    const response = await GET(new Request("http://localhost/api/drive/authorize"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Solo profesores pueden conectar Drive" });
  });

  it("redirects to the OAuth URL when user is a teacher", async () => {
    const oauthUrl = "https://accounts.google.com/o/oauth2/auth?state=teacher-123";

    const { client } = new SupabaseMockBuilder()
      .mockAuth({ id: "teacher-123", email: "teacher@example.com" })
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);
    vi.mocked(getAuthorizeUrl).mockReturnValue(oauthUrl);

    const response = await GET(new Request("https://aula-it.vercel.app/api/drive/authorize"));

    expect(getAuthorizeUrl).toHaveBeenCalledWith("teacher-123", "https://aula-it.vercel.app");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(oauthUrl);
  });
});
