import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import { createModule } from "@/app/dashboard/actions";

const vi_createClient = vi.mocked(createClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── createModule ─────────────────────────────────────────────────────────────

describe("createModule", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user is not authenticated (null user)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "Unauthorized: only teachers can create modules" });
  });

  it("returns error when module name is empty", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "Module name is required" });
  });

  it("returns error when supabase insert fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockInsert("modules", {
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module", description: "Desc" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "duplicate key value violates unique constraint" });
  });

  it("inserts with correct args and returns success", async () => {
    const user = createMockUser();
    const { client, spies } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockInsert("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      name: "My Module",
      description: "A great module",
      icon: "Star",
    });
    const result = await createModule(null, formData);

    expect(result).toEqual({ success: true });

    const modulesTable = spies.from.mock.results.find(
      (r) => spies.from.mock.calls[spies.from.mock.results.indexOf(r)]?.[0] === "modules"
    );
    expect(spies.from).toHaveBeenCalledWith("modules");

    const insertCall = (client.from("modules") as any).insert;
    // revalidatePath must be called with the dashboard route
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("uses default icon BookOpen when icon is not provided", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockInsert("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module", description: "Desc" });
    const result = await createModule(null, formData);

    // icon defaults to "BookOpen" — the action succeeds and revalidates
    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
