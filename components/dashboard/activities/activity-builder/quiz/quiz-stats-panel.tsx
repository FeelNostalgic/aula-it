"use client";

import { useEffect, useState } from "react";
import { getQuizStatsAttempts } from "@/app/activities/[id]/edit/actions";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { getQuizFixedQuestions } from "@/lib/quiz-content";
import {
    buildQuizStatsForAttempt,
    getGroupStatsAvailability,
    QUIZ_STATS_METRIC_TONE,
    QUIZ_STATS_MODE,
    QUIZ_STATS_VALUE_UNIT,
    QUIZ_STATS_VISUALIZATION_KIND,
    type QuizQuestionStatsSnapshot,
    type QuizStatsChartPoint,
    type QuizStatsTeacherAttempt,
    type QuizStatsVisualization,
} from "@/lib/quiz-core";
import { cn } from "@/lib/utils";
import type { QuizContent, QuizQuestionType } from "@/types/activity";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { AlertCircle, BarChart3, Eye, EyeOff, PieChart as PieChartIcon, RefreshCw, Users } from "lucide-react";

type QuizStatsPanelProps = {
    stepId: string;
    content: QuizContent;
    visible: boolean;
};

type QuizStatsPanelPreferences = {
    studentsOpenByQuestionId: Record<string, boolean>;
    chartKindByVisualizationKey: Record<string, string>;
    selectedDimensionByVisualizationKey: Record<string, string>;
};

const DEFAULT_STATS_PREFERENCES: QuizStatsPanelPreferences = {
    studentsOpenByQuestionId: {},
    chartKindByVisualizationKey: {},
    selectedDimensionByVisualizationKey: {},
};

const CHART_SLICE_COLORS = [
    "var(--chart-1)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "#06B6D4",
    "#EC4899",
    "#84CC16",
    "#F43F5E",
    "#6366F1",
    "#14B8A6",
    "#FACC15",
];

function getQuestionTypeLabel(questionType: QuizQuestionType) {
    switch (questionType) {
        case "multiple_choice": return "Opción múltiple";
        case "true_false": return "Verdadero/Falso";
        case "short_answer": return "Respuesta corta";
        case "likert": return "Likert";
        case "numeric": return "Numérica";
        case "fill_in_the_blank_dropdown": return "Texto con huecos";
        case "table_drag_drop": return "Tabla drag & drop";
        case "matching_pairs": return "Emparejar";
        case "ordering_sequence": return "Ordenar";
        case "categorization_drag_drop": return "Clasificar";
        default: return questionType;
    }
}

function getBarColor(isCorrect?: boolean) {
    if (isCorrect === true) return "var(--chart-2)";
    return "var(--chart-1)";
}

function getPointColor(entry: QuizStatsChartPoint, index: number, chartKind: string = QUIZ_STATS_VISUALIZATION_KIND.BAR) {
    if (entry.key === "blank" || entry.key === "empty") return "var(--muted-foreground)";
    if (entry.correct === true) return getBarColor(entry.correct);
    return CHART_SLICE_COLORS[index % CHART_SLICE_COLORS.length];
}

function buildChartConfig(data: QuizStatsChartPoint[], visualization: QuizStatsVisualization, chartKind: string): ChartConfig {
    return data.reduce<ChartConfig>((config, point, index) => {
        config[point.key] = {
            label: point.label,
            color: getPointColor(point, index, chartKind),
        };
        return config;
    }, {
        value: {
            label: visualization.valueLabel,
            color: "var(--chart-1)",
        },
    });
}

function getVisualizationStorageKey(questionId: string, visualizationKey: string) {
    return `${questionId}:${visualizationKey}`;
}

function getChartKindLabel(kind: string) {
    if (kind === QUIZ_STATS_VISUALIZATION_KIND.BAR) return "Barras";
    if (kind === QUIZ_STATS_VISUALIZATION_KIND.DONUT) return "Donut";
    if (kind === QUIZ_STATS_VISUALIZATION_KIND.PIE) return "Tarta";
    return "Histograma";
}

function getChartKindIcon(kind: string) {
    if (kind === QUIZ_STATS_VISUALIZATION_KIND.BAR || kind === QUIZ_STATS_VISUALIZATION_KIND.HISTOGRAM) {
        return <BarChart3 className="size-3.5" />;
    }
    return <PieChartIcon className="size-3.5" />;
}

function getStoredPreferences(stepId: string): QuizStatsPanelPreferences {
    if (typeof window === "undefined") return DEFAULT_STATS_PREFERENCES;
    const raw = window.localStorage.getItem(`aula-it:quiz-stats:${stepId}:preferences`);
    if (!raw) return DEFAULT_STATS_PREFERENCES;

    try {
        const parsed = JSON.parse(raw) as Partial<QuizStatsPanelPreferences>;
        return {
            studentsOpenByQuestionId: parsed.studentsOpenByQuestionId ?? {},
            chartKindByVisualizationKey: parsed.chartKindByVisualizationKey ?? {},
            selectedDimensionByVisualizationKey: parsed.selectedDimensionByVisualizationKey ?? {},
        };
    } catch {
        return DEFAULT_STATS_PREFERENCES;
    }
}

function formatMetricTone(tone?: string) {
    if (tone === QUIZ_STATS_METRIC_TONE.SUCCESS) return "text-emerald-400";
    if (tone === QUIZ_STATS_METRIC_TONE.WARNING) return "text-amber-300";
    if (tone === QUIZ_STATS_METRIC_TONE.MUTED) return "text-text-muted";
    return "text-foreground";
}

function formatPointValue(entry: QuizStatsChartPoint, visualization: QuizStatsVisualization) {
    if (visualization.valueUnit === QUIZ_STATS_VALUE_UNIT.PERCENT) {
        const suffix = entry.count !== undefined && entry.total !== undefined ? ` · ${entry.count}/${entry.total}` : "";
        return `${entry.value}%${suffix}`;
    }

    if (entry.total !== undefined && entry.total > 0) {
        const percentage = Math.round((entry.value / entry.total) * 100);
        return `${entry.value} (${percentage}%)`;
    }

    return String(entry.value);
}

function ChartFigure({
    title,
    data,
    visualization,
    chartKind,
}: {
    title?: string;
    data: QuizStatsChartPoint[];
    visualization: QuizStatsVisualization;
    chartKind: string;
}) {
    const chartConfig = buildChartConfig(data, visualization, chartKind);
    const totalValue = data.reduce((total, point) => total + point.value, 0);

    return (
        <div className="space-y-3">
            {title && (
                <h5 className="text-xs font-bold uppercase tracking-widest text-text-muted">{title}</h5>
            )}

            {data.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {data.map((point, index) => (
                        <div key={point.key} className="inline-flex items-center gap-2 rounded-lg border border-border/30 bg-surface/60 px-2.5 py-1.5 text-xs">
                            <span
                                className="size-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: getPointColor(point, index, chartKind) }}
                            />
                            <span className="max-w-56 truncate text-foreground">{point.label}</span>
                            {point.correct && (
                                <span className="rounded border border-accent-green/30 bg-accent-green/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-green">
                                    Correcta
                                </span>
                            )}
                            <span className="font-mono text-text-muted">{formatPointValue(point, visualization)}</span>
                        </div>
                    ))}
                </div>
            )}

            {data.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/40 py-12 text-center text-sm text-text-muted">
                    Sin datos para esta vista.
                </div>
            ) : (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    {chartKind === QUIZ_STATS_VISUALIZATION_KIND.DONUT || chartKind === QUIZ_STATS_VISUALIZATION_KIND.PIE ? (
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={(
                                    <ChartTooltipContent
                                        formatter={(_, __, item) => {
                                            const point = item.payload as QuizStatsChartPoint;
                                            return (
                                                <div className="flex flex-1 justify-between gap-3 text-xs">
                                                    <span className="text-muted-foreground">{point.label}</span>
                                                    <span className="font-mono text-foreground">{formatPointValue(point, visualization)}</span>
                                                </div>
                                            );
                                        }}
                                    />
                                )}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="label"
                                innerRadius={chartKind === QUIZ_STATS_VISUALIZATION_KIND.DONUT ? 70 : 0}
                                strokeWidth={4}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={entry.key} fill={getPointColor(entry, index, chartKind)} />
                                ))}
                                {chartKind === QUIZ_STATS_VISUALIZATION_KIND.DONUT && (
                                    <Label
                                        content={({ viewBox }) => {
                                            if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                                            return (
                                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-black">
                                                        {totalValue}
                                                    </tspan>
                                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-[11px] font-semibold">
                                                        {visualization.valueLabel}
                                                    </tspan>
                                                </text>
                                            );
                                        }}
                                    />
                                )}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="label" className="flex flex-wrap justify-center gap-3" />} />
                        </PieChart>
                    ) : visualization.kind === QUIZ_STATS_VISUALIZATION_KIND.HISTOGRAM ? (
                        <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12, top: 8 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={58} className="text-[10px]" />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <ChartTooltip
                                cursor={false}
                                content={(
                                    <ChartTooltipContent
                                        formatter={(_, __, item) => {
                                            const point = item.payload as QuizStatsChartPoint;
                                            return (
                                                <div className="flex flex-1 justify-between gap-3 text-xs">
                                                    <span className="text-muted-foreground">{point.label}</span>
                                                    <span className="font-mono text-foreground">{formatPointValue(point, visualization)}</span>
                                                </div>
                                            );
                                        }}
                                    />
                                )}
                            />
                            <Bar dataKey="value" radius={8}>
                                {data.map((entry, index) => (
                                    <Cell key={entry.key} fill={getPointColor(entry, index, chartKind)} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis
                                dataKey="label"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={150}
                                className="text-[11px]"
                            />
                            <XAxis
                                dataKey="value"
                                type="number"
                                allowDecimals={visualization.valueUnit === QUIZ_STATS_VALUE_UNIT.PERCENT}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={visualization.valueUnit === QUIZ_STATS_VALUE_UNIT.PERCENT ? (value) => `${value}%` : undefined}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={(
                                    <ChartTooltipContent
                                        indicator="line"
                                        formatter={(_, __, item) => {
                                            const point = item.payload as QuizStatsChartPoint;
                                            return (
                                                <div className="flex flex-1 justify-between gap-3 text-xs">
                                                    <span className="text-muted-foreground">{point.label}</span>
                                                    <span className="font-mono text-foreground">{formatPointValue(point, visualization)}</span>
                                                </div>
                                            );
                                        }}
                                    />
                                )}
                            />
                            <Bar dataKey="value" radius={8}>
                                {data.map((entry, index) => (
                                    <Cell key={entry.key} fill={getPointColor(entry, index, chartKind)} />
                                ))}
                            </Bar>
                        </BarChart>
                    )}
                </ChartContainer>
            )}
        </div>
    );
}

function VisualizationCard({
    visualization,
    storageKey,
    selectedKind,
    selectedDimensionKey,
    onKindChange,
    onDimensionChange,
}: {
    visualization: QuizStatsVisualization;
    storageKey: string;
    selectedKind?: string;
    selectedDimensionKey?: string;
    onKindChange: (storageKey: string, kind: string) => void;
    onDimensionChange: (storageKey: string, dimensionKey: string) => void;
}) {
    const allowedKinds = visualization.allowedKinds ?? [visualization.kind];
    const fallbackKind = visualization.defaultKind ?? visualization.kind;
    const effectiveKind = allowedKinds.includes(selectedKind as QuizStatsVisualization["kind"])
        ? selectedKind ?? fallbackKind
        : fallbackKind;
    const selectedDimension = visualization.dimensions?.find((dimension) => dimension.key === selectedDimensionKey)
        ?? visualization.dimensions?.[0];
    const chartData = selectedDimension?.data ?? visualization.data;
    const chartGroups = selectedDimension?.charts?.length
        ? selectedDimension.charts
        : [{ key: "main", label: "", data: chartData }];

    return (
        <div className="rounded-xl border border-border/40 bg-background/40 p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">{visualization.title}</h4>
                    {visualization.description && (
                        <p className="text-xs text-text-muted">{visualization.description}</p>
                    )}
                    {selectedDimension?.description && (
                        <p className="text-xs font-medium text-foreground">Correcta: {selectedDimension.description}</p>
                    )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {visualization.dimensions && visualization.dimensions.length > 1 && (
                        <Select value={selectedDimension?.key} onValueChange={(value) => onDimensionChange(storageKey, value)}>
                            <SelectTrigger className="h-9 min-w-44 border-border/50 bg-background text-xs">
                                <SelectValue placeholder="Selecciona vista" />
                            </SelectTrigger>
                            <SelectContent>
                                {visualization.dimensions.map((dimension) => (
                                    <SelectItem key={dimension.key} value={dimension.key}>
                                        {dimension.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {allowedKinds.length > 1 && (
                        <Select value={effectiveKind} onValueChange={(value) => onKindChange(storageKey, value)}>
                            <SelectTrigger className="h-9 min-w-36 border-border/50 bg-background text-xs">
                                <SelectValue placeholder="Tipo de gráfico" />
                            </SelectTrigger>
                            <SelectContent>
                                {allowedKinds.map((kind) => (
                                    <SelectItem key={kind} value={kind}>
                                        <span className="flex items-center gap-2">
                                            {getChartKindIcon(kind)}
                                            {getChartKindLabel(kind)}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {visualization.contextText && (
                <div className="mb-4 rounded-lg border border-border/30 bg-surface/50 px-3 py-2">
                    {visualization.contextLabel && (
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">{visualization.contextLabel}</p>
                    )}
                    <p className="text-sm text-foreground">{visualization.contextText}</p>
                </div>
            )}

            <div className="space-y-6">
                {chartGroups.map((chartGroup) => (
                    <ChartFigure
                        key={chartGroup.key}
                        title={chartGroup.label}
                        data={chartGroup.data}
                        visualization={visualization}
                        chartKind={effectiveKind}
                    />
                ))}
            </div>
        </div>
    );
}

export function QuizStatsPanel({ stepId, content, visible }: QuizStatsPanelProps) {
    const [attempts, setAttempts] = useState<QuizStatsTeacherAttempt[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<QuizStatsPanelPreferences>(() => getStoredPreferences(stepId));

    const availability = getGroupStatsAvailability(content);
    const enabled = content.saveQuestionStats && availability.enabled;

    useEffect(() => {
        setPreferences(getStoredPreferences(stepId));
    }, [stepId]);

    useEffect(() => {
        window.localStorage.setItem(`aula-it:quiz-stats:${stepId}:preferences`, JSON.stringify(preferences));
    }, [preferences, stepId]);

    function updateChartKind(storageKey: string, kind: string) {
        setPreferences((current) => ({
            ...current,
            chartKindByVisualizationKey: {
                ...current.chartKindByVisualizationKey,
                [storageKey]: kind,
            },
        }));
    }

    function updateSelectedDimension(storageKey: string, dimensionKey: string) {
        setPreferences((current) => ({
            ...current,
            selectedDimensionByVisualizationKey: {
                ...current.selectedDimensionByVisualizationKey,
                [storageKey]: dimensionKey,
            },
        }));
    }

    function toggleStudentRows(questionId: string) {
        setPreferences((current) => ({
            ...current,
            studentsOpenByQuestionId: {
                ...current.studentsOpenByQuestionId,
                [questionId]: !current.studentsOpenByQuestionId[questionId],
            },
        }));
    }

    useEffect(() => {
        if (!visible || !enabled) return;
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setError(null);
            const result = await getQuizStatsAttempts(stepId);
            if (cancelled) return;
            if (result.error) {
                setError(result.error);
                setAttempts([]);
                setIsLoading(false);
                return;
            }
            const nextAttempts = (result.attempts ?? []) as QuizStatsTeacherAttempt[];
            setAttempts(nextAttempts);
            if (!selectedAttempt && nextAttempts.length > 0) {
                setSelectedAttempt(String(nextAttempts[0].attempt_number));
            }
            setIsLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [enabled, stepId, visible]);

    const attemptNumbers = [...new Set(attempts.map((attempt) => attempt.attempt_number))];
    const attemptNumber = selectedAttempt ? Number(selectedAttempt) : attemptNumbers[0] ?? 1;
    const attemptsForSelectedNumber = attempts.filter((attempt) => attempt.attempt_number === attemptNumber);
    const effectiveQuestions = attemptsForSelectedNumber[0]?.resolved_questions?.length
        ? attemptsForSelectedNumber[0].resolved_questions
        : getQuizFixedQuestions(content);
    const questionStats = buildQuizStatsForAttempt(
        effectiveQuestions,
        attemptsForSelectedNumber,
        !!content.penalizeWrongAnswers,
    );
    const gradedQuestionStats = questionStats.filter((question) => question.mode === QUIZ_STATS_MODE.GRADED);
    const averageFullCorrectRate = gradedQuestionStats.length > 0
        ? Math.round(
            gradedQuestionStats.reduce((total, question) => total + (question.fullCorrectRate ?? 0), 0) / gradedQuestionStats.length,
        )
        : null;

    if (!content.saveQuestionStats) {
        return (
            <Card className="border-dashed border-border/50 bg-surface/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="size-4 text-accent-blue" />
                        Estadísticas grupales desactivadas
                    </CardTitle>
                    <CardDescription>
                        Activa el guardado de estadísticas en Configuración para comparar respuestas por intento y por alumno.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!availability.enabled) {
        return (
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-amber-300">
                        <AlertCircle className="size-4" />
                        Estadísticas comparables no disponibles
                    </CardTitle>
                    <CardDescription className="text-amber-200/80">
                        {availability.reason}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
                <RefreshCw className="size-4 animate-spin" />
                Cargando estadísticas...
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                    <CardTitle className="text-base text-red-300">Error al cargar estadísticas</CardTitle>
                    <CardDescription className="text-red-200/80">{error}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (attemptNumbers.length === 0) {
        return (
            <Card className="border-dashed border-border/50 bg-surface/20">
                <CardHeader>
                    <CardTitle className="text-base">Todavía no hay intentos</CardTitle>
                    <CardDescription>
                        Cuando los alumnos respondan este quiz, aquí verás la comparación grupal por intento.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-border/50 bg-surface-dark/40">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="size-4 text-accent-blue" />
                            Estadísticas grupales por intento
                        </CardTitle>
                        <CardDescription>
                            Usa esta vista para debatir respuestas con la clase y detectar errores recurrentes por pregunta.
                        </CardDescription>
                    </div>
                    <div className="w-full md:w-56">
                        <Select value={String(attemptNumber)} onValueChange={setSelectedAttempt}>
                            <SelectTrigger className="bg-background border-border/50">
                                <SelectValue placeholder="Selecciona intento" />
                            </SelectTrigger>
                            <SelectContent>
                                {attemptNumbers.map((value) => (
                                    <SelectItem key={value} value={String(value)}>
                                        Intento {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border/40 bg-background/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Alumnos en este intento</p>
                        <p className="mt-2 text-3xl font-black font-mono text-foreground">{attemptsForSelectedNumber.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Preguntas analizadas</p>
                        <p className="mt-2 text-3xl font-black font-mono text-foreground">{questionStats.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Acierto medio completo</p>
                        <p className="mt-2 text-3xl font-black font-mono text-foreground">
                            {averageFullCorrectRate !== null ? `${averageFullCorrectRate}%` : "n/d"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {questionStats.map((question, index) => {
                const studentRowsOpen = !!preferences.studentsOpenByQuestionId[question.questionId];

                return (
                <Card key={question.questionId} className="border-border/50 bg-surface-dark/30">
                    <CardHeader className="gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-accent-blue/30 text-accent-blue">Q{index + 1}</Badge>
                                    <Badge variant="outline" className="border-border/50 text-text-muted">
                                        {getQuestionTypeLabel(question.questionType)}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "border-border/50",
                                            question.mode === QUIZ_STATS_MODE.GRADED
                                                ? "text-emerald-300"
                                                : "text-sky-300",
                                        )}
                                    >
                                        {question.mode === QUIZ_STATS_MODE.GRADED ? "Evaluativa" : "Descriptiva"}
                                    </Badge>
                                </div>
                                <CardTitle className="text-base">{question.questionText || "Pregunta sin enunciado"}</CardTitle>
                                <CardDescription>
                                    {question.mode === QUIZ_STATS_MODE.GRADED
                                        ? `${question.fullCorrectCount}/${question.participants} respuestas totalmente correctas`
                                        : `${question.participants} respuestas comparadas en distribución`}
                                </CardDescription>
                            </div>
                            {question.mode === QUIZ_STATS_MODE.GRADED ? (
                                <div className="rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-right">
                                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Acierto completo</p>
                                    <p className="mt-1 text-2xl font-black font-mono text-foreground">{question.fullCorrectRate}%</p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-right">
                                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Lectura</p>
                                    <p className="mt-1 text-sm font-semibold text-sky-300">Distribución de la clase</p>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {question.summaryMetrics.length > 0 && (
                            <div className="grid gap-3 md:grid-cols-3">
                                {question.summaryMetrics.map((metric) => (
                                    <div key={metric.key} className="rounded-xl border border-border/40 bg-background/50 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{metric.label}</p>
                                        <p className={cn("mt-2 text-lg font-black font-mono", formatMetricTone(metric.tone))}>{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {question.visualizations.length > 0 && (
                            <div className={cn("grid gap-4", question.visualizations.length > 1 ? "xl:grid-cols-2" : "grid-cols-1")}>
                                {question.visualizations.map((visualization) => {
                                    const storageKey = getVisualizationStorageKey(question.questionId, visualization.key);
                                    return (
                                        <VisualizationCard
                                            key={visualization.key}
                                            visualization={visualization}
                                            storageKey={storageKey}
                                            selectedKind={preferences.chartKindByVisualizationKey[storageKey]}
                                            selectedDimensionKey={preferences.selectedDimensionByVisualizationKey[storageKey]}
                                            onKindChange={updateChartKind}
                                            onDimensionChange={updateSelectedDimension}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <div className="rounded-xl border border-border/40 bg-background/30">
                            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Respuestas individuales</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-border/50 bg-background sm:w-auto"
                                    onClick={() => toggleStudentRows(question.questionId)}
                                >
                                    {studentRowsOpen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    {studentRowsOpen ? "Ocultar alumnos" : "Mostrar alumnos"}
                                </Button>
                            </div>
                            {studentRowsOpen && (
                                <div className="overflow-hidden border-t border-border/40">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-border/40">
                                                <TableHead className="w-48">Alumno</TableHead>
                                                <TableHead className="w-40">Resultado</TableHead>
                                                <TableHead>Respuesta detallada</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {question.studentRows.map((studentRow) => (
                                                <TableRow key={studentRow.studentId} className="border-border/30">
                                                    <TableCell className="font-medium text-foreground">{studentRow.studentName}</TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <p className={cn(
                                                                "text-sm font-semibold",
                                                                studentRow.isFullyCorrect === true
                                                                    ? "text-emerald-400"
                                                                    : studentRow.isFullyCorrect === false
                                                                        ? "text-amber-300"
                                                                        : question.questionType === "short_answer"
                                                                            ? "text-text-muted"
                                                                            : "text-sky-300"
                                                            )}>
                                                                {studentRow.answerLabel}
                                                            </p>
                                                            <p className="text-xs text-text-muted">
                                                                {studentRow.isFullyCorrect === true
                                                                    ? "Todo correcto"
                                                                    : studentRow.isFullyCorrect === false
                                                                        ? "Con errores"
                                                                        : question.questionType === "short_answer"
                                                                            ? "Respuesta abierta"
                                                                            : "Respuesta descriptiva"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1.5">
                                                            {studentRow.rows.map((row) => (
                                                                <div key={row.id} className="rounded-lg border border-border/30 bg-surface/60 px-3 py-2">
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                        <span className="font-semibold text-foreground">{row.label}</span>
                                                                        <span className="text-text-muted">→</span>
                                                                        <span className="text-foreground">{row.value}</span>
                                                                        {row.expectedValue && (
                                                                            <span className="text-text-muted">· correcta: {row.expectedValue}</span>
                                                                        )}
                                                                        {row.isCorrect !== null && (
                                                                            <span className={cn(
                                                                                "ml-auto font-bold uppercase tracking-widest",
                                                                                row.isCorrect ? "text-emerald-400" : "text-red-400"
                                                                            )}>
                                                                                {row.isCorrect ? "OK" : "Error"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                );
            })}
        </div>
    );
}
