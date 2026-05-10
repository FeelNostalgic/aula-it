import type {
    QuizAttempt,
    QuizFixedBlock,
    QuizQuestion,
    QuizQuestionBlock,
    QuizSectionBlock,
} from "@/types/activity";

type QuizFixedContent = {
    blocks?: QuizFixedBlock[];
    questions?: QuizQuestion[];
};

export type QuizRenderSectionItem = {
    kind: "section";
    id: string;
    section: QuizSectionBlock;
};

export type QuizRenderQuestionItem = {
    kind: "question";
    id: string;
    question: QuizQuestion;
    sectionId: string | null;
    sectionTitle: string | null;
};

export type QuizRenderItem = QuizRenderSectionItem | QuizRenderQuestionItem;

export function isQuizSectionBlock(block: QuizFixedBlock): block is QuizSectionBlock {
    return block.kind === "section";
}

export function isQuizQuestionBlock(block: QuizFixedBlock): block is QuizQuestionBlock {
    return block.kind === "question";
}

export function createQuizQuestionBlock(question: QuizQuestion): QuizQuestionBlock {
    return {
        id: question.id,
        kind: "question",
        question,
    };
}

export function createQuizSectionBlock(title = "Nueva sección"): QuizSectionBlock {
    return {
        id: crypto.randomUUID(),
        kind: "section",
        title,
    };
}

function normalizeQuestionBlock(block: QuizQuestionBlock): QuizQuestionBlock | null {
    if (!block.question) return null;

    return {
        id: block.question.id,
        kind: "question",
        question: block.question,
    };
}

function normalizeSectionBlock(block: QuizSectionBlock): QuizSectionBlock {
    return {
        id: block.id,
        kind: "section",
        title: block.title ?? "",
    };
}

export function getQuizFixedBlocks(content: QuizFixedContent): QuizFixedBlock[] {
    if (content.blocks?.length) {
        return content.blocks.reduce<QuizFixedBlock[]>((blocks, block) => {
            if (block.kind === "section") {
                blocks.push(normalizeSectionBlock(block));
                return blocks;
            }

            const normalized = normalizeQuestionBlock(block);
            if (normalized) blocks.push(normalized);
            return blocks;
        }, []);
    }

    return (content.questions ?? []).map((question) => createQuizQuestionBlock(question));
}

export function getQuizFixedQuestions(content: QuizFixedContent): QuizQuestion[] {
    return getQuizFixedBlocks(content)
        .filter(isQuizQuestionBlock)
        .map((block) => block.question);
}

export function syncQuizContent<T extends QuizFixedContent>(content: T): T & { blocks: QuizFixedBlock[]; questions: QuizQuestion[] } {
    const blocks = getQuizFixedBlocks(content);

    return {
        ...content,
        blocks,
        questions: blocks.filter(isQuizQuestionBlock).map((block) => block.question),
    };
}

export function getQuizResolvedQuestions(content: QuizFixedContent, attempt?: QuizAttempt | null): QuizQuestion[] {
    if (attempt?.resolved_questions?.length) return attempt.resolved_questions;
    return getQuizFixedQuestions(content);
}

export function buildQuizRenderItems(
    content: QuizFixedContent,
    resolvedQuestions?: QuizQuestion[],
): QuizRenderItem[] {
    const fixedBlocks = getQuizFixedBlocks(content);
    const items: QuizRenderItem[] = [];
    let currentSection: QuizSectionBlock | null = null;

    if (!resolvedQuestions) {
        for (const block of fixedBlocks) {
            if (isQuizSectionBlock(block)) {
                currentSection = block;
                items.push({
                    kind: "section",
                    id: block.id,
                    section: block,
                });
                continue;
            }

            items.push({
                kind: "question",
                id: block.question.id,
                question: block.question,
                sectionId: currentSection?.id ?? null,
                sectionTitle: currentSection?.title ?? null,
            });
        }

        return items;
    }

    const questionSectionMap = new Map<string, QuizSectionBlock | null>();
    currentSection = null;

    for (const block of fixedBlocks) {
        if (isQuizSectionBlock(block)) {
            currentSection = block;
            continue;
        }

        questionSectionMap.set(block.question.id, currentSection);
    }

    let lastSectionId: string | null = null;

    for (const question of resolvedQuestions) {
        const section = questionSectionMap.get(question.id) ?? null;

        if (section && section.id !== lastSectionId) {
            items.push({
                kind: "section",
                id: section.id,
                section,
            });
            lastSectionId = section.id;
        } else if (!section) {
            lastSectionId = null;
        }

        items.push({
            kind: "question",
            id: question.id,
            question,
            sectionId: section?.id ?? null,
            sectionTitle: section?.title ?? null,
        });
    }

    return items;
}

export function getPaginatedQuizRenderItems(items: QuizRenderItem[], questionsPerPage?: number, currentPage = 0): QuizRenderItem[] {
    if (!questionsPerPage || questionsPerPage < 1) return items;

    const questionItems = items.filter((item): item is QuizRenderQuestionItem => item.kind === "question");
    const pageQuestions = questionItems.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

    if (pageQuestions.length === 0) return [];

    const paginatedItems: QuizRenderItem[] = [];
    let lastSectionId: string | null = null;

    for (const item of pageQuestions) {
        if (item.sectionId && item.sectionId !== lastSectionId) {
            paginatedItems.push({
                kind: "section",
                id: item.sectionId,
                section: {
                    id: item.sectionId,
                    kind: "section",
                    title: item.sectionTitle ?? "",
                },
            });
            lastSectionId = item.sectionId;
        } else if (!item.sectionId) {
            lastSectionId = null;
        }

        paginatedItems.push(item);
    }

    return paginatedItems;
}
