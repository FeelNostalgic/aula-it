import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { POST } from "@/app/auth/sign-out/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");

// ─── POST /auth/sign-out ──────────────────────────────────────────────────────

describe("POST /auth/sign-out", () => {
  it("calls signOut and revalidatePath then redirects to /login when user is logged in", async () => {
    const user = createMockUser();
    const { client, spies } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockSignOut()
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request("http://localhost:3000/auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(spies.auth.signOut).toHaveBeenCalledOnce();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );
  });

  it("does NOT call signOut but still revalidatePath and redirects to /login when no user", async () => {
    const { client, spies } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request("http://localhost:3000/auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(spies.auth.signOut).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );
  });

  it("returns a 302 redirect (not 307)", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const request = new Request("http://localhost:3000/auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(302);
  });
});
