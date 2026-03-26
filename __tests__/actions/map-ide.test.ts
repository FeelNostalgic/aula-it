import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import {
  updateActivityPosition,
  createActivityConnection,
  deleteActivityConnection,
  removeActivityFromMap,
  updateActivityTitlePosition,
} from "@/components/map-ide/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// ─── updateActivityPosition ───────────────────────────────────────────────────

describe("updateActivityPosition", () => {
  it("updates activity x/y coordinates and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockActivityAccess("activity-1", "unit-1", "user-teacher-01", "creator")
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateActivityPosition("activity-1", 200, 350, "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure for visitor role", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockActivityAccess("activity-1", "unit-1", "user-visitor-01", "viewer")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateActivityPosition("activity-1", 200, 350, "unit-1");

    expect(result).toEqual({
      success: false,
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("returns failure when DB update errors", async () => {
    const dbError = { message: "update failed", code: "42501" };
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockActivityAccess("activity-1", "unit-1", "user-teacher-01", "creator")
      .mockUpdate("activities", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateActivityPosition("activity-1", 200, 350, "unit-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── createActivityConnection ─────────────────────────────────────────────────

describe("createActivityConnection", () => {
  it("inserts connection with default handles and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockInsert("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure for visitor role", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-visitor-01", "viewer")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({
      success: false,
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("returns failure when DB insert errors", async () => {
    const dbError = { message: "insert failed", code: "23503" };
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockInsert("activity_connections", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── deleteActivityConnection ─────────────────────────────────────────────────

describe("deleteActivityConnection", () => {
  it("deletes connection by id and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("activity_connections", { data: { source_activity_id: "activity-1" }, error: null })
      .mockActivityAccess("activity-1", "unit-1", "user-teacher-01", "creator")
      .mockDelete("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteActivityConnection("connection-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure for visitor role", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("activity_connections", { data: { source_activity_id: "activity-1" }, error: null })
      .mockActivityAccess("activity-1", "unit-1", "user-visitor-01", "viewer")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteActivityConnection("connection-1", "unit-1");

    expect(result).toEqual({
      success: false,
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });
});

// ─── removeActivityFromMap ────────────────────────────────────────────────────

describe("removeActivityFromMap", () => {
  it("delegates to updateActivityPosition with null coordinates and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockActivityAccess("activity-1", "unit-1", "user-teacher-01", "creator")
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await removeActivityFromMap("activity-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });
});

// ─── updateActivityTitlePosition ──────────────────────────────────────────────

describe("updateActivityTitlePosition", () => {
  it("updates title_position field and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockActivityAccess("activity-1", "unit-1", "user-teacher-01", "creator")
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateActivityTitlePosition("activity-1", "bottom", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });
});

