import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createAdminClient } from "@/utils/supabase/admin";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile, createMockModule, createMockUnit, createMockActivity } from "../helpers/fixtures";
import {
  createModule,
  updateDashboardSettings,
  reorderModules,
  reorderUnits,
  duplicateModule,
  pingActiveDay,
} from "@/app/dashboard/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
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

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not authenticated (null user)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Module" });
    const result = await createModule(null, formData);

    expect(result).toEqual({ error: "No autenticado." });
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

    expect(result).toEqual({ error: "Solo profesores." });
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

    expect(result).toEqual({ error: "El nombre del módulo es obligatorio" });
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

// ─── updateDashboardSettings ──────────────────────────────────────────────────

describe("updateDashboardSettings", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateDashboardSettings(3);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("upserts grid_columns and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockUpsert("app_settings", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateDashboardSettings(4);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns error when upsert fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockUpsert("app_settings", { data: null, error: { message: "DB error" } })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateDashboardSettings(4);

    expect(result).toEqual({ error: "DB error" });
  });
});

// ─── reorderModules ───────────────────────────────────────────────────────────

describe("reorderModules", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderModules([{ id: "m1", order_index: 0 }]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderModules([{ id: "m1", order_index: 0 }]);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("updates all modules in parallel via admin client and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("modules", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderModules([
      { id: "m1", order_index: 0 },
      { id: "m2", order_index: 1 },
    ]);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── reorderUnits ─────────────────────────────────────────────────────────────

describe("reorderUnits", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderUnits("m1", [{ id: "u1", order_index: 0 }]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderUnits("m1", [{ id: "u1", order_index: 0 }]);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("updates all units and revalidates module path", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("units", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderUnits("m1", [
      { id: "u1", order_index: 0 },
      { id: "u2", order_index: 1 },
    ]);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/m1");
  });
});

// ─── duplicateModule ──────────────────────────────────────────────────────────

describe("duplicateModule", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateModule("m1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateModule("m1");

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when module is not found", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("modules", { data: null, error: { message: "not found" } })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateModule("m1");

    expect(result).toEqual({ error: "Módulo no encontrado" });
  });

  it("duplicates module with - copia suffix and returns success", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const originalModule = createMockModule({ name: "My Module", units: [] } as any);
    const newModule = createMockModule({ id: "new-module-id", name: "My Module - copia" });
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("modules", { data: originalModule, error: null })
      .mockInsert("modules", { data: newModule, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateModule("module-00000000-0000-0000-0000-000000000001");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── pingActiveDay ───────────────────────────────────────────────────────────

describe("pingActiveDay", () => {
  it("does not increment streak when it's the same local day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T18:00:00.000Z"));

    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const selectEqSingle = vi.fn().mockResolvedValue({
      data: { streak_days: 5, last_active_at: "2026-04-20T05:00:00.000Z" },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ single: selectEqSingle });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const adminClient = {
      from: vi.fn().mockReturnValue({ select, update }),
    };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    await pingActiveDay("Europe/Madrid");

    expect(update).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("increments streak by 1 when local day is consecutive", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T06:00:00.000Z"));

    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const selectEqSingle = vi.fn().mockResolvedValue({
      data: { streak_days: 7, last_active_at: "2026-04-19T03:00:00.000Z" },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ single: selectEqSingle });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const adminClient = {
      from: vi.fn().mockReturnValue({ select, update }),
    };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    await pingActiveDay("Europe/Madrid");

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        streak_days: 8,
      })
    );
    vi.useRealTimers();
  });

  it("resets streak to 1 when there is a day gap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T08:00:00.000Z"));

    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const selectEqSingle = vi.fn().mockResolvedValue({
      data: { streak_days: 9, last_active_at: "2026-04-17T03:00:00.000Z" },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ single: selectEqSingle });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const adminClient = {
      from: vi.fn().mockReturnValue({ select, update }),
    };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    await pingActiveDay("Europe/Madrid");

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        streak_days: 1,
      })
    );
    vi.useRealTimers();
  });

  it("falls back safely when timezone is invalid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T08:00:00.000Z"));

    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const selectEqSingle = vi.fn().mockResolvedValue({
      data: { streak_days: 2, last_active_at: "2026-04-19T03:00:00.000Z" },
      error: null,
    });
    const selectEq = vi.fn().mockReturnValue({ single: selectEqSingle });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const adminClient = {
      from: vi.fn().mockReturnValue({ select, update }),
    };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    await expect(pingActiveDay("Invalid/Timezone")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
