import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google-drive-api";
import { GET } from "@/app/api/drive/callback/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/admin");

describe("GET /api/drive/callback", () => {
  it("redirects to /dashboard?drive=error when `code` param is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/drive/callback?state=teacher-123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard?drive=error");
  });

  it("redirects to /dashboard?drive=error when `state` (teacherId) param is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/drive/callback?code=auth-code"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard?drive=error");
  });

  it("redirects to /dashboard?drive=error when token exchange fails", async () => {
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: null,
      refresh_token: null,
      expiry_date: null,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/drive/callback?code=bad-code&state=teacher-123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard?drive=error");
  });

  it("upserts the token and redirects to /dashboard?drive=connected on success", async () => {
    const tokens = {
      access_token: "access-abc",
      refresh_token: "refresh-xyz",
      expiry_date: new Date("2026-01-01T12:00:00Z").getTime(),
    };
    vi.mocked(exchangeCodeForTokens).mockResolvedValue(tokens as any);

    const { client } = new SupabaseMockBuilder()
      .mockUpsert("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(client as any);

    const request = new NextRequest(
      "http://localhost/api/drive/callback?code=good-code&state=teacher-123"
    );

    const response = await GET(request);

    expect(exchangeCodeForTokens).toHaveBeenCalledWith("good-code", "http://localhost");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/dashboard?drive=connected"
    );
  });

  it("reuses the stored refresh_token when Google does not return a new one", async () => {
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      access_token: "access-abc",
      refresh_token: null,
      expiry_date: new Date("2026-01-01T12:00:00Z").getTime(),
    } as any);

    const { client } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "stored-refresh-token" },
        error: null,
      })
      .mockUpsert("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(client as any);

    const request = new NextRequest(
      "http://localhost/api/drive/callback?code=good-code&state=teacher-123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard?drive=connected");
  });
});
