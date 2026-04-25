"use client";

import { useEffect, useState } from "react";
import { getQuizStatsAttempts } from "@/app/activities/[id]/edit/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { getQuizFixedQuestions } from "@/lib/quiz-content";
import { buildQuizStatsForAttempt, getGroupStatsAvailability, type QuizStatsTeacherAttempt } from "@/lib/quiz-core";
import { cn } from "@/lib/utils";
import type { QuizContent, QuizQuestionType } from "@/types/activity";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { AlertCircle, BarChart3, RefreshCw, Users } from "lucide-react";

type QuizStatsPanelProps = {
    stepId: string;
    content: QuizContent;
    visible: boolean;
};

const chartConfig = {
    value: {
        label: "Respuestas",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig;

function getQuestionTypeLabel(questionType: QuizQuestionType) {
    switch (questionType) {
        case "multiple_choice": return "Opción múltiple";
        case "true_false": return "Verdadero/Falso";
        case "short_answer": return "Respuesta corta";
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
    if (isCorrect === false) return "var(--chart-5)";
    return "var(--chart-1)";
}

export function QuizStatsPanel({ stepId, content, visible }: QuizStatsPanelProps) {
    const [attempts, setAttempts] = useState<QuizStatsTeacherAttempt[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availability = getGroupStatsAvailability(content);
    const enabled = content.saveQuestionStats && availability.enabled;

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
                            {questionStats.length > 0
                                ? Math.round(questionStats.reduce((total, question) => total + question.fullCorrectRate, 0) / questionStats.length)
                                : 0}
                            %
                        </p>
                    </div>
                </CardContent>
            </Card>

            {questionStats.map((question, index) => (
                <Card key={question.questionId} className="border-border/50 bg-surface-dark/30">
                    <CardHeader className="gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="border-accent-blue/30 text-accent-blue">Q{index + 1}</Badge>
                                    <Badge variant="outline" className="border-border/50 text-text-muted">
                                        {getQuestionTypeLabel(question.questionType)}
                                    </Badge>
                                </div>
                                <CardTitle className="text-base">{question.questionText || "Pregunta sin enunciado"}</CardTitle>
                                <CardDescription>
                                    {question.fullCorrectCount}/{question.participants} respuestas totalmente correctas
                                </CardDescription>
                            </div>
                            <div className="rounded-xl border border-border/40 bg-background/60 px-4 py-3 text-right">
                                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Acierto completo</p>
                                <p className="mt-1 text-2xl font-black font-mono text-foreground">{question.fullCorrectRate}%</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {question.chartData.length > 0 && (
                            <div className="rounded-xl border border-border/40 bg-background/40 p-4">
                                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                                    <BarChart
                                        accessibilityLayer
                                        data={question.chartData}
                                        layout="vertical"
                                        margin={{ left: 24, right: 16 }}
                                    >
                                        <CartesianGrid horizontal={false} />
                                        <YAxis
                                            dataKey="label"
                                            type="category"
                                            tickLine={false}
                                            axisLine={false}
                                            width={140}
                                            className="text-[11px]"
                                        />
                                        <XAxis dataKey="value" type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                        <Bar dataKey="value" radius={8}>
                                            {question.chartData.map((entry) => (
                                                <Cell key={entry.key} fill={getBarColor(entry.correct)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        )}

                        <div className="rounded-xl border border-border/40 bg-background/30 overflow-hidden">
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
                                                                : "text-text-muted"
                                                    )}>
                                                        {studentRow.answerLabel}
                                                    </p>
                                                    <p className="text-xs text-text-muted">
                                                        {studentRow.isFullyCorrect === true
                                                            ? "Todo correcto"
                                                            : studentRow.isFullyCorrect === false
                                                                ? "Con errores"
                                                                : "Respuesta abierta"}
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
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
