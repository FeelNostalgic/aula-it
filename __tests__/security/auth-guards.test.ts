/**
 * T5.1 — Auth Guard Audit
 *
 * This file systematically documents which server actions have auth guards and
 * which ones rely exclusively on Supabase RLS for access control.
 *
 * Findings:
 *   UNGUARDED — app/dashboard/units/[id]/actions.ts:
 *     updateActivityStatus, updateActivityPosition, updateMultipleActivityPositions,
 *     addActivityConnection, removeActivityConnection
 *
 *   UNGUARDED — components/map-ide/actions.ts:
 *     updateActivityPosition, createActivityConnection, deleteActivityConnection,
 *     removeActivityFromMap, updateActivityTitlePosition
 *
 *   GUARDED — verified below:
 *     createModule, createUnit, gradeSubmission, createPhase, submitDeliverable
 */

import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile } from "../helpers/fixtures";

// Units actions (unguarded subset)
import {
  updateActivityStatus,
  updateActivityPosition,
  updateMultipleActivityPositions,
  addActivityConnection,
  removeActivityConnection,
} from "@/app/dashboard/units/[id]/actions";

// Map IDE actions (all unguarded)
import {
  updateActivityPosition as mapUpdateActivityPosition,
  createActivityConnection,
  deleteActivityConnection,
  removeActivityFromMap,
  updateActivityTitlePosition,
} from "@/components/map-ide/actions";

// Guarded actions
import { createModule } from "@/app/dashboard/actions";
import { createUnit, enrollStudent } from "@/app/dashboard/modules/[id]/actions";
import { gradeSubmission } from "@/app/dashboard/units/[id]/actions";
import { createPhase } from "@/app/activities/[id]/edit/actions";
import { submitDeliverable } from "@/app/activities/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);

// ─── UNGUARDED FUNCTIONS ───────────────────────────────────────────────────────
//
// These functions call createClient() and proceed directly to DB operations
// without ever calling supabase.auth.getUser(). Protection relies 100% on RLS.
//
// The tests below use a client that has a broken auth state (mockAuthError) to
// prove the function never consults auth — it still reaches the DB layer.

describe("Auth Guard Audit", () => {
  describe("Functions WITHOUT auth guards (RLS-only)", () => {
    // ─── units/[id]/actions.ts ────────────────────────────────────────────────

    it("updateActivityStatus — no auth check, proceeds directly to DB update", async () => {
      // SECURITY GAP: no getUser() call before the DB update.
      // An unauthenticated request reaches the DB; RLS must reject it there.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired") // auth is broken — function ignores this
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityStatus("activity-1", "published");

      // Succeeds because the function never checked auth — it went straight to DB.
      expect(result).toEqual({ success: true });
    });

    it("updateActivityPosition — no auth check, proceeds directly to DB update", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityPosition("activity-1", 100, 200);

      expect(result).toEqual({ success: true });
    });

    it("updateMultipleActivityPositions — no auth check, proceeds directly to DB update", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateMultipleActivityPositions([
        { id: "activity-1", x: 10, y: 20 },
      ]);

      expect(result).toEqual({ success: true });
    });

    it("addActivityConnection — no auth check, proceeds directly to DB insert", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockInsert("activity_connections", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await addActivityConnection("unit-1", "src-1", "tgt-1");

      expect(result).toEqual({ success: true });
    });

    it("removeActivityConnection — no auth check, proceeds directly to DB delete", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockDelete("activity_connections", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await removeActivityConnection("connection-1");

      expect(result).toEqual({ success: true });
    });

    // ─── components/map-ide/actions.ts ───────────────────────────────────────

    it("updateActivityPosition (map-ide) — no auth check, proceeds directly to DB update", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await mapUpdateActivityPosition("activity-1", 50, 75, "unit-1");

      expect(result).toEqual({ success: true });
    });

    it("createActivityConnection — no auth check, proceeds directly to DB insert", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockInsert("activity_connections", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await createActivityConnection("unit-1", "src-1", "tgt-1");

      expect(result).toEqual({ success: true });
    });

    it("deleteActivityConnection — no auth check, proceeds directly to DB delete", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockDelete("activity_connections", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await deleteActivityConnection("connection-1", "unit-1");

      expect(result).toEqual({ success: true });
    });

    it("removeActivityFromMap — no auth check, proceeds directly to DB update (via updateActivityPosition)", async () => {
      // SECURITY GAP: delegates to mapUpdateActivityPosition which also has no guard.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await removeActivityFromMap("activity-1", "unit-1");

      expect(result).toEqual({ success: true });
    });

    it("updateActivityTitlePosition — no auth check, proceeds directly to DB update", async () => {
      // SECURITY GAP: no getUser() call.
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .mockUpdate("activities", { data: null, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityTitlePosition("activity-1", "bottom", "unit-1");

      expect(result).toEqual({ success: true });
    });
  });

  // ─── GUARDED FUNCTIONS ─────────────────────────────────────────────────────
  //
  // These functions call getUser() as the very first operation and return an
  // explicit error object when the session is missing or invalid.

  describe("Functions WITH auth guards (verified)", () => {
    it("createModule — rejects unauthenticated request before touching DB", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await createModule(null, createFormData({ name: "My Module" }));

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("createUnit — rejects unauthenticated request before touching DB", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const formData = createFormData({ module_id: "module-1", name: "Unit 1" });
      const result = await createUnit(null, formData);

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("gradeSubmission — rejects non-teacher role before writing to DB", async () => {
      const userClient = new SupabaseMockBuilder()
        .mockAuth(createMockUser())
        .mockQuery("profiles", {
          data: createMockProfile({ role: "student" }),
          error: null,
        })
        .build();
      vi_createClient.mockResolvedValue(userClient.client as any);

      const adminClient = new SupabaseMockBuilder().build();
      vi_createAdminClient.mockReturnValue(adminClient.client as any);

      const result = await gradeSubmission("submission-1", {
        gradingMode: "score",
        score: 100,
      });

      expect(result).toEqual({ error: "Solo profesores." });
    });

    it("createPhase — rejects unauthenticated request before touching DB", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuth(null) // null user — getUser returns { user: null }
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const adminClient = new SupabaseMockBuilder().build();
      vi_createAdminClient.mockReturnValue(adminClient.client as any);

      const result = await createPhase("activity-1", "Phase 1", 0);

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("submitDeliverable — rejects unauthenticated request after URL validation", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
        // step query returns no due_date so deadline check is skipped
        .mockQuery("activity_steps", { data: { due_date: null }, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await submitDeliverable(
        "step-1",
        "https://docs.google.com/document/d/abc123",
        "activity-1"
      );

      expect(result).toEqual({ error: "No autenticado." });
    });
  });
});
