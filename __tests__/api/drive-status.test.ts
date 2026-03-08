import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { GET } from "@/app/api/drive/status/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

describe("GET /api/drive/status", () => {
  it("returns { connected: false } when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: false });
  });

  it("returns { connected: false } when no token row exists for the user", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "user-123", email: "teacher@example.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: false });
  });

  it("returns { connected: true } when a token row exists for the user", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "user-123", email: "teacher@example.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: { id: "token-row-1" }, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: true });
  });
});
