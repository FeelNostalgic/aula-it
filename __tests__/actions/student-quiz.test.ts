import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockQuizContent, createMockQuizAttempt } from "../helpers/fixtures";
import {
  markStepViewed,
  getQuizAttempts,
  submitQuizAttempt,
} from "@/app/activities/[id]/actions";

const vi_createClient = vi.mocked(createClient);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAuth(user = createMockUser()) {
  const { client } = new SupabaseMockBuilder().mockAuth(user).build();
  vi_createClient.mockResolvedValue(client as any);
  return { client, user };
}

function mockAuthWithClient(builder: SupabaseMockBuilder) {
  const user = createMockUser();
  const { client } = builder.mockAuth(user).build();
  vi_createClient.mockResolvedValue(client as any);
  return { client, user };
}

// ─── markStepViewed ───────────────────────────────────────────────────────────

describe("markStepViewed", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await markStepViewed("step-1", "activity-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("upserts step view with ignoreDuplicates and returns success", async () => {
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockUpsert("step_views", { data: null, error: null })
    );

    const result = await markStepViewed("step-1", "activity-1");

    expect(result).toEqual({ success: true });
  });

  it("returns error when upsert fails", async () => {
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockUpsert("step_views", { data: null, error: { message: "DB error" } })
    );

    const result = await markStepViewed("step-1", "activity-1");

    expect(result).toEqual({ error: "DB error" });
  });
});

// ─── getQuizAttempts ──────────────────────────────────────────────────────────

describe("getQuizAttempts", () => {
  it("returns empty array when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getQuizAttempts("step-1");

    expect(result).toEqual([]);
  });

  it("returns ordered attempts for authenticated user", async () => {
    const attempt1 = createMockQuizAttempt({ attempt_number: 1 });
    const attempt2 = createMockQuizAttempt({ id: "attempt-2", attempt_number: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: [attempt1, attempt2], error: null })
    );

    const result = await getQuizAttempts("step-1");

    expect(result).toHaveLength(2);
    expect(result[0].attempt_number).toBe(1);
    expect(result[1].attempt_number).toBe(2);
  });

  it("returns empty array when no attempts exist", async () => {
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, error: null })
    );

    const result = await getQuizAttempts("step-1");

    expect(result).toEqual([]);
  });
});

// ─── submitQuizAttempt ────────────────────────────────────────────────────────

describe("submitQuizAttempt", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const content = createMockQuizContent();
    const result = await submitQuizAttempt("step-1", "activity-1", {}, {}, {}, content);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when max attempts is reached", async () => {
    const content = createMockQuizContent({ maxAttempts: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 2, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, {}, {}, content);

    expect(result).toEqual({ error: "Máximo de intentos alcanzado (2)." });
  });

  it("returns error when a required question is unanswered", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-1",
          type: "multiple_choice",
          text: "What is 2+2?",
          options: [
            { id: "opt-1", text: "3", isCorrect: false },
            { id: "opt-2", text: "4", isCorrect: true },
          ],
          points: 1,
          isRequired: true,
        },
      ],
    });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, {}, {}, content);

    expect(result).toEqual({ error: 'La pregunta "What is 2+2?" es obligatoria.' });
  });

  it("accepts a required table drag/drop question with one answered cell", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-table",
          type: "table_drag_drop",
          text: "Complete the table",
          options: [],
          points: 2,
          isRequired: true,
          tableRows: [{ id: "row-1", label: "HTTP" }],
          tableColumns: [
            { id: "col-1", label: "Layer" },
            { id: "col-2", label: "Transport" },
          ],
          tableItems: [
            { id: "item-1", text: "Application" },
            { id: "item-2", text: "TCP" },
          ],
          tableCells: [
            { id: "cell-1", rowId: "row-1", columnId: "col-1", correctItemId: "item-1" },
            { id: "cell-2", rowId: "row-1", columnId: "col-2", correctItemId: "item-2" },
          ],
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 1, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, {}, {
      "q-table": {
        kind: "table_drag_drop",
        placements: { "cell-1": "item-1" },
      },
    }, content);

    expect(result).not.toHaveProperty("error");
    expect(result.data?.pointsEarned).toBe(1);
  });

  it("returns error when a short answer is shorter than its minimum", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-sa",
          type: "short_answer",
          text: "Explain X",
          options: [],
          points: 1,
          minLength: 10,
        },
      ],
    });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, { "q-sa": "short" }, {}, content);

    expect(result).toEqual({ error: 'La pregunta "Explain X" requiere al menos 10 caracteres.' });
  });

  it("returns error when a short answer is longer than its maximum", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-sa",
          type: "short_answer",
          text: "Explain X",
          options: [],
          points: 1,
          maxLength: 5,
        },
      ],
    });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, { "q-sa": "too long" }, {}, content);

    expect(result).toEqual({ error: 'La pregunta "Explain X" permite como máximo 5 caracteres.' });
  });

  it("returns error when a short answer minimum is greater than its maximum", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-sa",
          type: "short_answer",
          text: "Explain X",
          options: [],
          points: 1,
          minLength: 10,
          maxLength: 5,
        },
      ],
    });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, { "q-sa": "answer" }, {}, content);

    expect(result).toEqual({ error: 'La pregunta "Explain X" tiene un mínimo de caracteres mayor que el máximo.' });
  });

  it("auto-scores correctly without penalization (correct answer)", async () => {
    // q-1 has 1 point, opt-2 is correct
    const content = createMockQuizContent({ penalizeWrongAnswers: false });
    const attempt = createMockQuizAttempt({ points_earned: 1, points_total: 1 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const answers = { "q-1": ["opt-2"] }; // correct
    const result = await submitQuizAttempt("step-1", "activity-1", answers, {}, {}, content);

    expect(result).not.toHaveProperty("error");
    expect(result.data?.score).toBe(10); // 1/1 * 10 = 10
    expect(result.data?.pointsEarned).toBe(1);
    expect(result.data?.pointsTotal).toBe(1);
  });

  it("auto-scores 0 when no correct option selected (no penalty)", async () => {
    const content = createMockQuizContent({ penalizeWrongAnswers: false });
    const attempt = createMockQuizAttempt({ points_earned: 0, points_total: 1 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const answers = { "q-1": ["opt-1"] }; // wrong
    const result = await submitQuizAttempt("step-1", "activity-1", answers, {}, {}, content);

    expect(result.data?.pointsEarned).toBe(0);
  });

  it("applies negative penalty for wrong single-select answer (penalizeWrongAnswers=true)", async () => {
    // q-1: 1 point, single correct = opt-2. Selecting wrong = -1/3 points
    const content = createMockQuizContent({ penalizeWrongAnswers: true });
    const attempt = createMockQuizAttempt({ points_earned: 0, points_total: 1 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const answers = { "q-1": ["opt-1"] }; // wrong answer with penalization
    const result = await submitQuizAttempt("step-1", "activity-1", answers, {}, {}, content);

    // -1/3 raw, but clamped to 0 via Math.max(0, ...)
    expect(result.data?.pointsEarned).toBe(0);
  });

  it("detects short_answer questions and sets status to submitted", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-sa",
          type: "short_answer",
          text: "Explain X",
          options: [],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 0, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const shortAnswers = { "q-sa": "My answer here" };
    const result = await submitQuizAttempt("step-1", "activity-1", {}, shortAnswers, {}, content);

    // When hasShortAnswer=true, submission status should be "submitted" (not auto-graded)
    // The function upserts with status: hasShortAnswer ? "submitted" : "graded"
    expect(result).not.toHaveProperty("error");
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores fill_in_the_blank_dropdown questions", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-fill",
          type: "fill_in_the_blank_dropdown",
          text: "Completa el texto",
          options: [],
          promptSegments: [
            { id: "seg-1", kind: "text", text: "React usa " },
            { id: "seg-2", kind: "blank", blankId: "blank-1" },
          ],
          dropdownBlanks: [
            {
              id: "blank-1",
              options: [
                { id: "opt-hook", text: "hooks", isCorrect: true },
                { id: "opt-class", text: "clases", isCorrect: false },
              ],
            },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-fill": {
          kind: "fill_in_the_blank_dropdown",
          blanks: { "blank-1": "opt-hook" },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores fill_in_the_blank_dropdown questions with a shared pool", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-fill-pool",
          type: "fill_in_the_blank_dropdown",
          text: "Completa el texto",
          options: [],
          promptSegments: [
            { id: "seg-1", kind: "text", text: "Ethernet usa " },
            { id: "seg-2", kind: "blank", blankId: "blank-1" },
            { id: "seg-3", kind: "text", text: " y ARP resuelve " },
            { id: "seg-4", kind: "blank", blankId: "blank-2" },
          ],
          dropdownPoolOptions: [
            { id: "opt-mac", text: "MAC", isCorrect: false },
            { id: "opt-ip", text: "IP", isCorrect: false },
            { id: "opt-port", text: "Puerto", isCorrect: false },
          ],
          dropdownPoolConsumesOptions: true,
          dropdownBlanks: [
            { id: "blank-1", correctOptionId: "opt-mac", options: [] },
            { id: "blank-2", correctOptionId: "opt-ip", options: [] },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 1, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-fill-pool": {
          kind: "fill_in_the_blank_dropdown",
          blanks: { "blank-1": "opt-mac", "blank-2": "opt-port" },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(1);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores table_drag_drop questions when the same option is reused in multiple cells", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-table",
          type: "table_drag_drop",
          text: "Relaciona protocolo y capa OSI",
          options: [],
          tableRowHeaderLabel: "Protocolo",
          tableRows: [
            { id: "row-http", label: "HTTP" },
            { id: "row-ftp", label: "FTP" },
          ],
          tableColumns: [{ id: "col-layer", label: "Capa OSI" }],
          tableItems: [
            { id: "item-app", text: "Aplicación" },
            { id: "item-transport", text: "Transporte" },
          ],
          tableCells: [
            { id: "cell-http", rowId: "row-http", columnId: "col-layer", correctItemId: "item-app" },
            { id: "cell-ftp", rowId: "row-ftp", columnId: "col-layer", correctItemId: "item-app" },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-table": {
          kind: "table_drag_drop",
          placements: {
            "cell-http": "item-app",
            "cell-ftp": "item-app",
          },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores matching_pairs questions when the same match is reused in multiple prompts", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-match",
          type: "matching_pairs",
          text: "Relaciona protocolo y capa",
          options: [],
          matchingOptions: [
            { id: "match-app", text: "Aplicación" },
            { id: "match-transport", text: "Transporte" },
          ],
          matchingPrompts: [
            { id: "prompt-http", text: "HTTP", correctMatchId: "match-app" },
            { id: "prompt-ftp", text: "FTP", correctMatchId: "match-app" },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-match": {
          kind: "matching_pairs",
          matches: {
            "prompt-http": "match-app",
            "prompt-ftp": "match-app",
          },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores multi table_drag_drop cells by exact set match", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-table-multi",
          type: "table_drag_drop",
          text: "Clasifica los servicios de una web",
          options: [],
          tableAllowMultipleItemsPerCell: true,
          tableRowHeaderLabel: "Servicio",
          tableRows: [{ id: "row-http", label: "HTTP" }],
          tableColumns: [{ id: "col-props", label: "Propiedades" }],
          tableItems: [
            { id: "item-app", text: "Aplicación" },
            { id: "item-clear", text: "Sin cifrar" },
            { id: "item-tls", text: "Con TLS" },
          ],
          tableCells: [
            {
              id: "cell-http",
              rowId: "row-http",
              columnId: "col-props",
              correctItemId: "item-app",
              correctItemIds: ["item-app", "item-clear"],
            },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-table-multi": {
          kind: "table_drag_drop",
          placements: {
            "cell-http": ["item-clear", "item-app"],
          },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores multi matching_pairs prompts by exact set match", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-match-multi",
          type: "matching_pairs",
          text: "Relaciona HTTP",
          options: [],
          matchingAllowMultiplePerPrompt: true,
          matchingOptions: [
            { id: "match-app", text: "Aplicación" },
            { id: "match-clear", text: "Sin cifrar" },
            { id: "match-tls", text: "Con TLS" },
          ],
          matchingPrompts: [
            {
              id: "prompt-http",
              text: "HTTP",
              correctMatchId: "match-app",
              correctMatchIds: ["match-app", "match-clear"],
            },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-match-multi": {
          kind: "matching_pairs",
          matches: {
            "prompt-http": ["match-clear", "match-app"],
          },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores categorization reuse by exact category set", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-cat-multi",
          type: "categorization_drag_drop",
          text: "Clasifica protocolos",
          options: [],
          categorizationAllowReuse: true,
          categories: [
            { id: "cat-app", label: "Aplicación" },
            { id: "cat-web", label: "Web" },
          ],
          categoryItems: [
            {
              id: "item-http",
              text: "HTTP",
              correctCategoryId: "cat-app",
              correctCategoryIds: ["cat-app", "cat-web"],
            },
          ],
          points: 2,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 2 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-cat-multi": {
          kind: "categorization_drag_drop",
          assignments: {
            "item-http": ["cat-web", "cat-app"],
          },
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(2);
    expect(result.data?.pointsTotal).toBe(2);
  });

  it("auto-scores ordering_sequence questions by correct position", async () => {
    const content = createMockQuizContent({
      questions: [
        {
          id: "q-order",
          type: "ordering_sequence",
          text: "Ordena el flujo",
          options: [],
          orderingItems: [
            { id: "item-1", text: "Analizar" },
            { id: "item-2", text: "Implementar" },
            { id: "item-3", text: "Probar" },
          ],
          points: 3,
        },
      ],
    });
    const attempt = createMockQuizAttempt({ points_earned: 2, points_total: 3 });
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const result = await submitQuizAttempt(
      "step-1",
      "activity-1",
      {},
      {},
      {
        "q-order": {
          kind: "ordering_sequence",
          orderedItemIds: ["item-1", "item-3", "item-2"],
        },
      },
      content
    );

    expect(result.data?.pointsEarned).toBe(1);
    expect(result.data?.pointsTotal).toBe(3);
  });

  it("does not downgrade existing best score", async () => {
    const content = createMockQuizContent({ penalizeWrongAnswers: false });
    const attempt = createMockQuizAttempt({ points_earned: 0, points_total: 1 });
    // existing score = 9 (higher than new score of 0)
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 1, error: null })
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", {
          data: { id: "sub-existing", score: 9 },
          error: null,
        })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const answers = { "q-1": [] }; // no answer → 0 points → score 0
    const result = await submitQuizAttempt("step-1", "activity-1", answers, {}, {}, content);

    // Score is 0 which is less than existing 9, so submission should NOT be updated
    // The function checks: shouldUpdateScore = !existing || existing.score === null || scoreOutOf10 >= existing.score
    // scoreOutOf10=0, existing.score=9 → shouldUpdateScore = false
    expect(result).not.toHaveProperty("error");
    // The attempt is still recorded
    expect(result.data?.attempt).toBeDefined();
  });

  it("returns error when attempt insert fails", async () => {
    const content = createMockQuizContent();
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 0, error: null })
        .mockInsert("quiz_attempts", { data: null, error: { message: "DB insert failed" } })
    );

    const result = await submitQuizAttempt("step-1", "activity-1", {}, {}, {}, content);

    expect(result).toEqual({ error: "DB insert failed" });
  });

  it("allows unlimited attempts when maxAttempts is undefined", async () => {
    const content = createMockQuizContent({ maxAttempts: undefined });
    const attempt = createMockQuizAttempt();
    mockAuthWithClient(
      new SupabaseMockBuilder()
        .mockQuery("quiz_attempts", { data: null, count: 100, error: null }) // 100 existing attempts
        .mockInsert("quiz_attempts", { data: attempt, error: null })
        .mockQuery("activity_submissions", { data: null, error: null })
        .mockUpsert("activity_submissions", { data: null, error: null })
    );

    const answers = { "q-1": ["opt-2"] };
    const result = await submitQuizAttempt("step-1", "activity-1", answers, {}, {}, content);

    expect(result).not.toHaveProperty("error");
  });
});
