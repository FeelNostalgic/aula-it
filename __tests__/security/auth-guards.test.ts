/**
 * T5.1 — Auth Guard Audit
 *
 * This file verifies that all server actions have proper auth guards.
 *
 * Findings:
 *   GUARDED — verified below:
 *     updateActivityStatus, updateActivityPosition, updateMultipleActivityPositions,
 *     addActivityConnection, removeActivityConnection (app/dashboard/units/[id]/actions.ts)
 *
 *     updateActivityPosition, createActivityConnection, deleteActivityConnection,
 *     removeActivityFromMap, updateActivityTitlePosition (components/map-ide/actions.ts)
 *
 *     createModule, createUnit, gradeSubmission, createPhase, submitDeliverable
 */

import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile } from "../helpers/fixtures";

// Units actions
import {
  updateActivityStatus,
  updateActivityPosition,
  updateMultipleActivityPositions,
  addActivityConnection,
  removeActivityConnection,
} from "@/app/dashboard/units/[id]/actions";

// Map IDE actions
import {
  updateActivityPosition as mapUpdateActivityPosition,
  createActivityConnection,
  deleteActivityConnection,
  removeActivityFromMap,
  updateActivityTitlePosition,
} from "@/components/map-ide/actions";

// Guarded actions
import { createModule } from "@/app/dashboard/actions";
import { createUnit } from "@/app/dashboard/modules/[id]/actions";
import { gradeSubmission } from "@/app/dashboard/units/[id]/actions";
import { createPhase } from "@/app/activities/[id]/edit/actions";
import { submitDeliverable } from "@/app/activities/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);

describe("Auth Guard Audit", () => {
  describe("Server Actions Security Verification", () => {
    // ─── units/[id]/actions.ts ────────────────────────────────────────────────

    it("updateActivityStatus — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityStatus("activity-1", "published");

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("updateActivityPosition — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityPosition("activity-1", 100, 200);

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("updateMultipleActivityPositions — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateMultipleActivityPositions([
        { id: "activity-1", x: 10, y: 20 },
      ]);

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("addActivityConnection — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await addActivityConnection("unit-1", "src-1", "tgt-1");

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("removeActivityConnection — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await removeActivityConnection("connection-1");

      expect(result).toEqual({ error: "No autenticado." });
    });

    // ─── components/map-ide/actions.ts ───────────────────────────────────────

    it("updateActivityPosition (map-ide) — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await mapUpdateActivityPosition("activity-1", 50, 75, "unit-1");

      expect(result).toEqual({ success: false, error: "No autenticado." });
    });

    it("createActivityConnection — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await createActivityConnection("unit-1", "src-1", "tgt-1");

      expect(result).toEqual({ success: false, error: "No autenticado." });
    });

    it("deleteActivityConnection — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await deleteActivityConnection("connection-1", "unit-1");

      expect(result).toEqual({ success: false, error: "No autenticado." });
    });

    it("removeActivityFromMap — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await removeActivityFromMap("activity-1", "unit-1");

      expect(result).toEqual({ success: false, error: "No autenticado." });
    });

    it("updateActivityTitlePosition — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("session expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await updateActivityTitlePosition("activity-1", "bottom", "unit-1");

      expect(result).toEqual({ success: false, error: "No autenticado." });
    });

    // ─── ADDITIONAL GUARDED FUNCTIONS ────────────────────────────────────────

    it("createModule — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await createModule(null, createFormData({ name: "My Module" }));

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("createUnit — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const formData = createFormData({ module_id: "module-1", name: "Unit 1" });
      const result = await createUnit(null, formData);

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("gradeSubmission — rejects non-teacher role", async () => {
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

    it("createPhase — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuth(null) 
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const adminClient = new SupabaseMockBuilder().build();
      vi_createAdminClient.mockReturnValue(adminClient.client as any);

      const result = await createPhase("activity-1", "Phase 1", 0);

      expect(result).toEqual({ error: "No autenticado." });
    });

    it("submitDeliverable — rejects unauthenticated request", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockAuthError("jwt expired")
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

