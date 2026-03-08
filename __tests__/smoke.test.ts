import { describe, it, expect } from "vitest";
import { SupabaseMockBuilder } from "./helpers/supabase-mock";
import { createFormData } from "./helpers/form-data";
import {
  createMockUser,
  createMockProfile,
  createMockModule,
  createMockUnit,
  createMockActivity,
  createMockPhase,
  createMockStep,
  createMockSubmission,
  createMockDriveToken,
} from "./helpers/fixtures";
import { RedirectError } from "./setup";

describe("Test infrastructure smoke tests", () => {
  describe("SupabaseMockBuilder", () => {
    it("can be instantiated and build() returns a client", () => {
      const { client } = new SupabaseMockBuilder().build();
      expect(client).toBeDefined();
    });

    it("client has .from() method", () => {
      const { client } = new SupabaseMockBuilder().build();
      expect(typeof client.from).toBe("function");
    });

    it("client has .auth.getUser() method", async () => {
      const user = createMockUser();
      const { client } = new SupabaseMockBuilder()
        .mockAuth(user)
        .build();

      expect(typeof client.auth.getUser).toBe("function");

      const result = await client.auth.getUser();
      expect(result.data).toEqual({ user });
      expect(result.error).toBeNull();
    });

    it("client.from() returns a chainable query object", async () => {
      const mockData = { id: "mod-1", name: "Test Module" };
      const { client } = new SupabaseMockBuilder()
        .mockQuery("modules", { data: mockData, error: null })
        .build();

      const result = await client.from("modules").select("*");
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it("supports deep chaining (select + eq + single)", async () => {
      const mockData = { id: "prof-1", role: "teacher" };
      const { client } = new SupabaseMockBuilder()
        .mockQuery("profiles", { data: mockData, error: null })
        .build();

      // This is the exact pattern used in actions.ts
      const result = await client
        .from("profiles")
        .select("role")
        .eq("id", "user-1")
        .single();

      expect(result.data).toEqual(mockData);
    });

    it("supports insert chain", async () => {
      const mockData = { id: "mod-2" };
      const { client } = new SupabaseMockBuilder()
        .mockInsert("modules", { data: mockData, error: null })
        .build();

      const result = await client
        .from("modules")
        .insert({ name: "New Module" });

      expect(result.data).toEqual(mockData);
    });

    it("spies track calls to .from()", () => {
      const { client, spies } = new SupabaseMockBuilder().build();

      client.from("profiles");
      client.from("modules");

      expect(spies.from).toHaveBeenCalledTimes(2);
      expect(spies.from).toHaveBeenCalledWith("profiles");
      expect(spies.from).toHaveBeenCalledWith("modules");
    });

    it("returns error responses when configured", async () => {
      const { client } = new SupabaseMockBuilder()
        .mockQuery("profiles", {
          data: null,
          error: { message: "Row not found" },
        })
        .build();

      const result = await client.from("profiles").select("*").single();
      expect(result.data).toBeNull();
      expect(result.error).toEqual({ message: "Row not found" });
    });

    it("mockAuth(null) returns user: null", async () => {
      const { client } = new SupabaseMockBuilder().mockAuth(null).build();
      const result = await client.auth.getUser();
      expect(result.data).toEqual({ user: null });
    });
  });

  describe("Fixtures", () => {
    it("createMockUser returns sensible defaults", () => {
      const user = createMockUser();
      expect(user.id).toBeDefined();
      expect(user.email).toContain("@");
    });

    it("createMockUser accepts overrides", () => {
      const user = createMockUser({ email: "custom@test.com" });
      expect(user.email).toBe("custom@test.com");
    });

    it("createMockProfile defaults to teacher role", () => {
      const profile = createMockProfile();
      expect(profile.role).toBe("teacher");
    });

    it("createMockProfile accepts student role", () => {
      const profile = createMockProfile({ role: "student" });
      expect(profile.role).toBe("student");
    });

    it("createMockModule returns a valid module shape", () => {
      const mod = createMockModule();
      expect(mod.id).toBeDefined();
      expect(mod.name).toBeDefined();
      expect(mod.teacher_id).toBeDefined();
    });

    it("createMockUnit returns a valid unit shape", () => {
      const unit = createMockUnit();
      expect(unit.status).toBe("published");
      expect(unit.view_type).toBe("list");
    });

    it("createMockActivity returns a valid activity shape", () => {
      const activity = createMockActivity();
      expect(activity.type).toBe("mission");
      expect(activity.difficulty).toBe("Medio");
    });

    it("createMockPhase returns a valid phase shape", () => {
      const phase = createMockPhase();
      expect(phase.order_index).toBe(0);
    });

    it("createMockStep defaults to theory type", () => {
      const step = createMockStep();
      expect(step.type).toBe("theory");
      expect(step.is_visible).toBe(true);
    });

    it("createMockSubmission defaults to pending status", () => {
      const sub = createMockSubmission();
      expect(sub.status).toBe("pending");
    });

    it("createMockDriveToken returns a valid token shape", () => {
      const token = createMockDriveToken();
      expect(token.access_token).toBeDefined();
      expect(token.refresh_token).toBeDefined();
    });
  });

  describe("FormData helper", () => {
    it("creates FormData from a plain object", () => {
      const fd = createFormData({ name: "Test", email: "test@example.com" });
      expect(fd.get("name")).toBe("Test");
      expect(fd.get("email")).toBe("test@example.com");
    });

    it("returns empty FormData for empty object", () => {
      const fd = createFormData({});
      expect(fd.get("anything")).toBeNull();
    });
  });

  describe("RedirectError", () => {
    it("can be thrown and caught", () => {
      expect(() => {
        throw new RedirectError("/dashboard");
      }).toThrow(RedirectError);
    });

    it("carries the url property", () => {
      try {
        throw new RedirectError("/login");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as RedirectError).url).toBe("/login");
      }
    });

    it("has a digest string for Next.js interop", () => {
      const err = new RedirectError("/home");
      expect(err.digest).toContain("NEXT_REDIRECT");
    });
  });
});
