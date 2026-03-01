"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Clock, Circle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type Student = {
    id: string;
    student_id: string; // The auth.users id
    profiles?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
};

type Activity = {
    id: string;
    title: string;
    type: string;
    xp: number;
    order_index: number;
};

type Submission = {
    id: string;
    activity_id: string;
    student_id: string;
    status: string; // "not_started" | "pending" | "completed"
    submission_url?: string | null;
    grade?: number | null;
};

interface UnitEvaluationTabProps {
    unitId: string;
    students: Student[];
    activities: Activity[];
    submissions: Submission[];
}

export function UnitEvaluationTab({ students, activities, submissions }: UnitEvaluationTabProps) {
    // Sort activities by order_index to display them as columns
    const sortedActivities = useMemo(() => {
        return [...activities].sort((a, b) => a.order_index - b.order_index);
    }, [activities]);

    // Create a map to quickly look up a student's submission for a specific activity
    const getSubmission = (studentId: string, activityId: string) => {
        return submissions.find(s => s.student_id === studentId && s.activity_id === activityId);
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="size-5 text-accent-green" />;
            case "pending":
                return <Clock className="size-5 text-accent-orange" />;
            case "not_started":
            default:
                return <Circle className="size-5 text-text-muted opacity-50" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Evaluación de la Unidad</h2>
                <p className="text-sm text-text-muted mt-1">
                    Revisa el progreso de tus alumnos y evalúa sus entregas directamente.
                </p>

                {/* Status Legend */}
                <div className="flex items-center gap-6 mt-4 p-3 bg-surface-dark border border-border-strong rounded-lg w-fit">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-accent-green" />
                        <span className="text-sm font-medium text-foreground">Completado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 text-accent-orange" />
                        <span className="text-sm font-medium text-foreground">Pendiente revisar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Circle className="size-4 text-text-muted opacity-50" />
                        <span className="text-sm font-medium text-foreground">No iniciado</span>
                    </div>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-2">No hay alumnos matriculados</h3>
                    <p className="text-text-muted text-sm max-w-sm">
                        Ve a la configuración del Módulo para matricular alumnos y poder evaluar su progreso.
                    </p>
                </div>
            ) : sortedActivities.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-2">No hay retos creados</h3>
                    <p className="text-text-muted text-sm max-w-sm">
                        Crea actividades en la pestaña "Retos" para poder evaluar a los alumnos.
                    </p>
                </div>
            ) : (
                <div className="border border-border-strong rounded-2xl overflow-hidden bg-surface-dark">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border-strong">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Alumno</th>
                                    {sortedActivities.map((activity, index) => (
                                        <th key={activity.id} className="px-6 py-4 font-bold text-center min-w-[120px]">
                                            <div className="flex flex-col items-center gap-1" title={activity.title}>
                                                <span className="truncate w-full block text-center">R{index + 1}</span>
                                                <span className="text-[10px] text-text-muted font-normal lowercase max-w-full truncate">{activity.xp} XP</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => {
                                    const profile = student.profiles;
                                    const studentName = profile?.full_name || profile?.email || "Usuario Desconocido";

                                    return (
                                        <tr
                                            key={student.id}
                                            className="border-b border-border-subtle hover:bg-surface/50 transition-colors last:border-0"
                                        >
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                {studentName}
                                            </td>

                                            {sortedActivities.map((activity) => {
                                                const submission = getSubmission(student.student_id, activity.id);
                                                const status = submission?.status || "not_started";

                                                return (
                                                    <td key={activity.id} className="px-6 py-4">
                                                        <div className="flex justify-center items-center">
                                                            {status === "pending" && submission?.submission_url ? (
                                                                <Link
                                                                    href={submission.submission_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group relative"
                                                                >
                                                                    {getStatusIcon(status)}
                                                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-accent-blue text-surface-dark p-0.5 rounded-full">
                                                                        <ArrowUpRight className="size-2.5" />
                                                                    </div>
                                                                </Link>
                                                            ) : (
                                                                getStatusIcon(status)
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
