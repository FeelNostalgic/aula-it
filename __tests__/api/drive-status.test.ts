import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { GET } from "@/app/api/drive/status/route";
import { DRIVE_CONNECTION_STATUS } from "@/lib/drive-connection-status";
import { getDriveConnectionStatus } from "@/lib/google-drive-api";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

describe("GET /api/drive/status", () => {
  it("returns disconnected when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: false, status: DRIVE_CONNECTION_STATUS.DISCONNECTED });
  });

  it("returns disconnected when no token row exists for the user", async () => {
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
    expect(body).toEqual({ connected: false, status: DRIVE_CONNECTION_STATUS.DISCONNECTED });
  });

  it("returns connected when the stored token is still valid", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "user-123", email: "teacher@example.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: { refresh_token: "refresh-token-1" }, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);
    vi.mocked(getDriveConnectionStatus).mockResolvedValue(DRIVE_CONNECTION_STATUS.CONNECTED);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: true, status: DRIVE_CONNECTION_STATUS.CONNECTED });
    expect(getDriveConnectionStatus).toHaveBeenCalledWith("refresh-token-1");
  });

  it("returns invalid when the stored token exists but is no longer usable", async () => {
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth({ id: "user-123", email: "teacher@example.com" })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: { refresh_token: "refresh-token-1" }, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);
    vi.mocked(getDriveConnectionStatus).mockResolvedValue(DRIVE_CONNECTION_STATUS.INVALID);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: false, status: DRIVE_CONNECTION_STATUS.INVALID });
  });
});
