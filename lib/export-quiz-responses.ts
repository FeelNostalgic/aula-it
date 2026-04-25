import { getQuizFixedQuestions } from "@/lib/quiz-content";
import { buildQuestionReview, QUIZ_QUESTION_TYPE, type QuizQuestionReview } from "@/lib/quiz-core";
import type { QuizAttempt, QuizContent, QuizQuestion } from "@/types/activity";
import type { StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";

type QuizResponsesExportConfig = {
    stepTitle: string;
    rows: StepSubmissionRow[];
    quizContent: QuizContent | null;
    attemptNumber: number;
};

function sanitizeFilenameSegment(value: string) {
    return value
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ -]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

function csvEscape(value: unknown) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function resolveAttemptForNumber(row: StepSubmissionRow, attemptNumber: number) {
    const attempts = row.quiz_attempts?.length
        ? row.quiz_attempts
        : row.quiz_attempt
            ? [row.quiz_attempt]
            : [];
    return attempts.find((attempt) => attempt.attempt_number === attemptNumber) ?? null;
}

function resolveQuestions(rows: StepSubmissionRow[], quizContent: QuizContent | null, attemptNumber: number): QuizQuestion[] {
    const fromAttempt = rows
        .map((row) => resolveAttemptForNumber(row, attemptNumber))
        .find((attempt) => (attempt?.resolved_questions?.length ?? 0) > 0);

    if (fromAttempt?.resolved_questions?.length) return fromAttempt.resolved_questions;
    const fromRows = rows.find((row) => (row.quiz_content?.questions?.length ?? 0) > 0)?.quiz_content?.questions;
    if (fromRows?.length) return fromRows;
    return quizContent ? getQuizFixedQuestions(quizContent) : [];
}

function normalizeReviewValue(value: string) {
    return value === "Sin respuesta" ? "" : value;
}

function extractReviewAnswer(review: QuizQuestionReview) {
    if (review.questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || review.questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        const selectedLabels = review.rows
            .filter((row) => row.value === "Seleccionada")
            .map((row) => row.label)
            .filter(Boolean);
        return selectedLabels.join(" | ");
    }

    if (review.questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER || review.questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return normalizeReviewValue(review.rows[0]?.value ?? "");
    }

    if (review.questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        return review.rows
            .map((row) => `${row.label}: ${normalizeReviewValue(row.value)}`)
            .join(" | ");
    }

    return review.rows
        .map((row) => `${row.label}: ${normalizeReviewValue(row.value)}`)
        .join(" | ");
}

function normalizeScore(pointsEarned: number, pointsTotal: number) {
    if (!pointsTotal) return "";
    return String(Math.round(((pointsEarned / pointsTotal) * 10) * 100) / 100);
}

type AttemptReviewInput = Pick<QuizAttempt, "answers" | "short_answers" | "structured_answers">;

export function exportQuizResponsesAsCSV(config: QuizResponsesExportConfig): void {
    const { stepTitle, rows, quizContent, attemptNumber } = config;
    const studentRows = rows.filter((row) => !row.is_group_submission);
    const questions = resolveQuestions(studentRows, quizContent, attemptNumber);
    const penalizeWrongAnswers = !!quizContent?.penalizeWrongAnswers;

    const headers = [
        "Alumno",
        "Estado",
        "Intento",
        "Puntos",
        "Nota /10",
        ...questions.map((question, index) => `P${index + 1}: ${question.text || "Sin enunciado"}`),
    ];

    const csvRows = studentRows.map((row) => {
        const attempt = resolveAttemptForNumber(row, attemptNumber);
        const reviewInput: AttemptReviewInput = {
            answers: attempt?.answers ?? {},
            short_answers: attempt?.short_answers ?? {},
            structured_answers: attempt?.structured_answers ?? {},
        };

        const pointsSummary = attempt ? `${attempt.points_earned}/${attempt.points_total}` : "";
        const scoreOutOf10 = attempt ? normalizeScore(attempt.points_earned, attempt.points_total) : "";
        const questionAnswers = questions.map((question) => {
            if (!attempt) return "";
            return extractReviewAnswer(buildQuestionReview(question, reviewInput, penalizeWrongAnswers));
        });

        return [
            row.student_name ?? row.student_email ?? "Sin nombre",
            row.status,
            String(attemptNumber),
            pointsSummary,
            scoreOutOf10,
            ...questionAnswers,
        ];
    });

    const csvContent = [headers, ...csvRows]
        .map((row) => row.map(csvEscape).join(","))
        .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `respuestas-quiz-${sanitizeFilenameSegment(stepTitle)}-intento-${attemptNumber}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
