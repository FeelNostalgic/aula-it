import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
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
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── updateActivityPosition ───────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("updateActivityPosition", () => {
  it("updates activity x/y coordinates and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityPosition("activity-1", 200, 350, "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure when DB update errors", async () => {
    const dbError = { message: "update failed", code: "42501" };
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityPosition("activity-1", 200, 350, "unit-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });

  it("accepts null coordinates to clear position", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityPosition("activity-1", null, null, "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });
});

// ─── createActivityConnection ─────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("createActivityConnection", () => {
  it("inserts connection with default handles and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockInsert("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("inserts connection with explicit custom handles and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockInsert("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createActivityConnection(
      "unit-1",
      "source-1",
      "target-1",
      "right",
      "left"
    );

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure when DB insert errors", async () => {
    const dbError = { message: "insert failed", code: "23503" };
    const { client } = new SupabaseMockBuilder()
      .mockInsert("activity_connections", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── deleteActivityConnection ─────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("deleteActivityConnection", () => {
  it("deletes connection by id and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockDelete("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivityConnection("connection-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure when DB delete errors", async () => {
    const dbError = { message: "delete failed", code: "42501" };
    const { client } = new SupabaseMockBuilder()
      .mockDelete("activity_connections", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivityConnection("connection-1", "unit-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── removeActivityFromMap ────────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("removeActivityFromMap", () => {
  it("delegates to updateActivityPosition with null coordinates and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await removeActivityFromMap("activity-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("propagates DB error from the underlying updateActivityPosition call", async () => {
    const dbError = { message: "update failed", code: "42501" };
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await removeActivityFromMap("activity-1", "unit-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});

// ─── updateActivityTitlePosition ──────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("updateActivityTitlePosition", () => {
  it("updates title_position field and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityTitlePosition("activity-1", "bottom", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/units/unit-1/map");
  });

  it("returns failure when DB update errors", async () => {
    const dbError = { message: "update failed", code: "42501" };
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: dbError })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityTitlePosition("activity-1", "top", "unit-1");

    expect(result).toEqual({ success: false, error: dbError });
    expect(vi_revalidatePath).not.toHaveBeenCalled();
  });
});
