import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { GET } from "@/app/auth/callback/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/server");

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── GET /auth/callback ───────────────────────────────────────────────────────

describe("GET /auth/callback", () => {
  it("redirects to auth-code-error when no code param is present", async () => {
    const request = new Request("http://localhost:3000/auth/callback");

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/auth-code-error"
    );
  });

  it("redirects to auth-code-error when exchangeCodeForSession fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockExchangeCode({
        data: null,
        error: { message: "invalid code" },
      })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=bad-code"
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/auth-code-error"
    );
  });

  it("redirects to origin/dashboard in development when exchange succeeds", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { client } = new SupabaseMockBuilder()
      .mockExchangeCode({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-code"
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("respects the next param when exchange succeeds", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { client } = new SupabaseMockBuilder()
      .mockExchangeCode({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-code&next=/profile"
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/profile"
    );
  });

  it("uses https://x-forwarded-host/dashboard when header is present (production)", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { client } = new SupabaseMockBuilder()
      .mockExchangeCode({ data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request(
      "http://localhost:3000/auth/callback?code=valid-code",
      {
        headers: {
          "x-forwarded-host": "my-app.vercel.app",
        },
      }
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://my-app.vercel.app/dashboard"
    );
  });
});
