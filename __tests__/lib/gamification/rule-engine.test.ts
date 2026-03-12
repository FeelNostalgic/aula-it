import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateStudentBadges } from "@/lib/gamification/rule-engine";
import { createAdminClient } from "@/utils/supabase/admin";

// Mock Supabase admin client
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("Gamification Rule Engine - evaluateStudentBadges", () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup a robust chainable mock
    const createChain = (data: any = null) => {
      const chain: any = Promise.resolve({ data, error: null });
      chain.from = vi.fn().mockImplementation(() => chain);
      chain.select = vi.fn().mockImplementation(() => chain);
      chain.eq = vi.fn().mockImplementation(() => chain);
      chain.order = vi.fn().mockImplementation(() => chain);
      chain.single = vi.fn().mockImplementation(() => chain);
      chain.insert = vi.fn().mockImplementation(() => Promise.resolve({ error: null }));
      return chain;
    };

    mockSupabase = createChain();
    (createAdminClient as any).mockReturnValue(mockSupabase);
  });

  const setupMockData = ({
    earnedBadges = [] as any[],
    classBadges = [] as any[],
    submissions = [] as any[],
    activities = [{ id: "act-1" }] as any[],
    unitData = { module_id: "mod-1" } as any,
    enrollment = { module_xp: 100 } as any
  }) => {
    mockSupabase.from.mockImplementation((table: string) => {
      let data: any = [];
      if (table === "student_badges") data = earnedBadges;
      else if (table === "class_badges") data = classBadges;
      else if (table === "activity_submissions") data = submissions;
      else if (table === "activities") data = activities;
      else if (table === "units") data = unitData;
      else if (table === "module_enrollments") data = enrollment;

      // Return a new chainable for this table
      const chain: any = Promise.resolve({ data, error: null });
      chain.select = vi.fn().mockImplementation(() => chain);
      chain.eq = vi.fn().mockImplementation(() => chain);
      chain.order = vi.fn().mockImplementation(() => chain);
      chain.single = vi.fn().mockImplementation(() => chain);
      chain.insert = mockSupabase.insert; // Share the same insert mock to track calls
      return chain;
    });
  };

  it("does not award badges if student already has them all", async () => {
    setupMockData({
      earnedBadges: [{ badge_id: "badge-1" }],
      classBadges: [{ id: "badge-1", condition_payload: { allOf: [{ field: "score", operator: "gte", value: 100 }] } }]
    });

    await evaluateStudentBadges("student-1", "unit-1");
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("awards a badge when a student meets the 100% score criteria", async () => {
    setupMockData({
      classBadges: [
        { 
          id: "badge-100", 
          condition_payload: { allOf: [{ field: "score", operator: "eq", value: 100 }] } 
        }
      ],
      submissions: [{ id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } }]
    });

    await evaluateStudentBadges("student-1", "unit-1", "sub-1");
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ badge_id: "badge-100", student_id: "student-1" })
      ])
    );
  });

  it("awards a badge for unit completion (100%)", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-complete", condition_payload: { allOf: [{ field: "unit_completion", operator: "gte", value: 100 }] } }
      ],
      activities: [{ id: "act-1" }, { id: "act-2" }],
      submissions: [
        { id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } },
        { id: "sub-2", score: 100, status: "graded", step: { phase: { activity_id: "act-2" } } }
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ badge_id: "badge-complete" })
      ])
    );
  });

  it("awards a badge for average score (gte 80)", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-pro", condition_payload: { allOf: [{ field: "average_score", operator: "gte", value: 80 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 70, status: "graded", step: { phase: { activity_id: "act-1" } } },
        { id: "sub-2", score: 90, status: "graded", step: { phase: { activity_id: "act-1" } } }
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ badge_id: "badge-pro" })
      ])
    );
  });
});
