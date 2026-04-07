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
  createUnitMapNode,
  updateUnitMapNode,
  deleteUnitMapNode,
  updateMapConnection,
  updateMapLayoutPositions,
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
      .mockInsert("activity_connections", { data: { id: "connection-1" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: true, connection: { id: "connection-1" } });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("inserts flow-node endpoints without treating them as activities", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockInsert("activity_connections", { data: { id: "connection-flow-1" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createActivityConnection("unit-1", "flow:node-1", "activity:target-1", "right", "left");

    expect(result).toEqual({ success: true, connection: { id: "connection-flow-1" } });
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
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
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
      .mockUnitAccess("unit-1", "user-visitor-01", "viewer")
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

// ─── unit map flow nodes ──────────────────────────────────────────────────────

describe("unit map flow nodes", () => {
  it("creates a flow node and returns the persisted row", async () => {
    const node = {
      id: "node-1",
      unit_id: "unit-1",
      type: "branch",
      label: "Bifurcación",
      description: "Elige una rama",
      position_x: 100,
      position_y: 200,
    };
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockInsert("unit_map_nodes", { data: node, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createUnitMapNode("unit-1", "branch", "Bifurcación", 100, 200, "Elige una rama");

    expect(result).toEqual({ success: true, node });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("updates flow node metadata", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockUpdate("unit_map_nodes", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateUnitMapNode("node-1", "unit-1", {
      type: "branch",
      label: "Pista",
      description: "Lee esto antes de seguir",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("deletes a flow node", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockDelete("unit_map_nodes", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteUnitMapNode("node-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });
});

// ─── map route metadata and layout ───────────────────────────────────────────

describe("map route metadata and layout", () => {
  it("updates route label and type", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockUpdate("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateMapConnection("connection-1", "unit-1", {
      label: "Ruta de refuerzo",
      routeType: "reinforcement",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("updates mixed activity and flow-node layout positions", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockUnitAccess("unit-1", "user-teacher-01", "creator")
      .mockUpdate("activities", { data: null, error: null })
      .mockUpdate("unit_map_nodes", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateMapLayoutPositions("unit-1", [
      { id: "activity:activity-1", x: 100, y: 200 },
      { id: "flow:node-1", x: 300, y: 200 },
    ]);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });
});

