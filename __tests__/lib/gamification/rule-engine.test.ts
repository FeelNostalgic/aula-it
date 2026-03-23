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
      chain.in = vi.fn().mockImplementation(() => chain);
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
      chain.in = vi.fn().mockImplementation(() => chain);
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

  // ── total_submissions field ────────────────────────────────────────────────

  it("awards badge based on total_submissions field", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-active", condition_payload: { allOf: [{ field: "total_submissions", operator: "gte", value: 2 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 80, status: "graded", step: { phase: { activity_id: "act-1" } } },
        { id: "sub-2", score: 70, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-active" })])
    );
  });

  // ── activities_completed field ─────────────────────────────────────────────

  it("awards badge based on activities_completed field", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-completer", condition_payload: { allOf: [{ field: "activities_completed", operator: "gte", value: 1 }] } }
      ],
      activities: [{ id: "act-1" }, { id: "act-2" }],
      submissions: [
        { id: "sub-1", score: 80, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-completer" })])
    );
  });

  // ── total_xp field ─────────────────────────────────────────────────────────

  it("awards badge based on total_xp field", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-xp", condition_payload: { allOf: [{ field: "total_xp", operator: "gte", value: 50 }] } }
      ],
      enrollment: { module_xp: 100 }
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-xp" })])
    );
  });

  // ── specific_activity_completed field ─────────────────────────────────────

  it("awards badge when specific activity is completed", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-specific", condition_payload: { allOf: [{ field: "specific_activity_completed", operator: "eq", value: "act-1" }] } }
      ],
      submissions: [
        { id: "sub-1", score: 90, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-specific" })])
    );
  });

  it("does NOT award badge when specific activity is NOT completed", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-specific", condition_payload: { allOf: [{ field: "specific_activity_completed", operator: "eq", value: "act-99" }] } }
      ],
      submissions: [
        { id: "sub-1", score: 90, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  // ── steps_completed field ──────────────────────────────────────────────────

  it("awards badge based on steps_completed field", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-steps", condition_payload: { allOf: [{ field: "steps_completed", operator: "gte", value: 2 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 80, status: "graded", step_id: "step-1", step: { phase: { activity_id: "act-1" } } },
        { id: "sub-2", score: 90, status: "graded", step_id: "step-2", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-steps" })])
    );
  });

  // ── any (OR) condition mode ────────────────────────────────────────────────

  it("awards badge when ANY condition matches (OR mode)", async () => {
    setupMockData({
      classBadges: [
        {
          id: "badge-or",
          condition_payload: {
            any: [
              { field: "score", operator: "eq", value: 100 },
              { field: "average_score", operator: "gte", value: 99 }, // this won't match
            ]
          }
        }
      ],
      submissions: [
        { id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1", "sub-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-or" })])
    );
  });

  it("does NOT award badge when NO conditions match in OR mode", async () => {
    setupMockData({
      classBadges: [
        {
          id: "badge-or",
          condition_payload: {
            any: [
              { field: "score", operator: "eq", value: 100 },
              { field: "average_score", operator: "gte", value: 99 },
            ]
          }
        }
      ],
      submissions: [
        { id: "sub-1", score: 50, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1", "sub-1");

    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  // ── lt and lte operators ───────────────────────────────────────────────────

  it("awards badge when score is lt a threshold", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-lt", condition_payload: { allOf: [{ field: "total_submissions", operator: "lt", value: 5 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 50, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-lt" })])
    );
  });

  it("awards badge when value is lte threshold", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-lte", condition_payload: { allOf: [{ field: "total_submissions", operator: "lte", value: 1 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 80, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-lte" })])
    );
  });

  // ── operator normalization ─────────────────────────────────────────────────

  it("normalizes SCORE_EQUALS operator to eq", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-norm", condition_payload: { allOf: [{ field: "score", operator: "SCORE_EQUALS", value: 100 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1", "sub-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-norm" })])
    );
  });

  it("normalizes SCORE_GREATER_THAN operator to gt", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-gt", condition_payload: { allOf: [{ field: "score", operator: "SCORE_GREATER_THAN", value: 80 }] } }
      ],
      submissions: [
        { id: "sub-1", score: 90, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1", "sub-1");

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-gt" })])
    );
  });

  // ── empty conditions array ─────────────────────────────────────────────────

  it("skips badge when conditions array is empty", async () => {
    setupMockData({
      classBadges: [
        { id: "badge-empty", condition_payload: { allOf: [] } }
      ],
      submissions: [
        { id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  // ── badge.activity_id scoping ──────────────────────────────────────────────

  it("scopes score evaluation to specific activity when badge.activity_id is set", async () => {
    setupMockData({
      classBadges: [
        {
          id: "badge-scoped",
          activity_id: "act-1",
          condition_payload: { allOf: [{ field: "score", operator: "eq", value: 100 }] }
        }
      ],
      submissions: [
        { id: "sub-1", score: 100, status: "graded", step: { phase: { activity_id: "act-1" } } },
        { id: "sub-2", score: 50, status: "graded", step: { phase: { activity_id: "act-2" } } },
      ]
    });

    await evaluateStudentBadges("student-1", "unit-1");

    // Should award because act-1 has score 100
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ badge_id: "badge-scoped" })])
    );
  });
});
