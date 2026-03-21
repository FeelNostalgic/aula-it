export type ExportGradesConfig = {
    unitName: string;
    students: { student_id: string; name: string }[];
    activitiesWithSteps: {
        id: string;
        title: string;
        evaluableSteps: { id: string; title: string }[];
    }[];
    computeStepGrade: (studentId: string, stepId: string) => { grade: number | null };
    computeActivityGrade: (studentId: string, activityId: string) => number | null;
    computeTotal: (studentId: string) => number | null;
};

export function exportGradesAsCSV(config: ExportGradesConfig): void {
    const { unitName, students, activitiesWithSteps, computeStepGrade, computeActivityGrade, computeTotal } = config;

    const headers: string[] = ['Alumno'];
    for (const activity of activitiesWithSteps) {
        for (const step of activity.evaluableSteps) {
            headers.push(`${activity.title} / ${step.title}`);
        }
        if (activity.evaluableSteps.length > 1) {
            headers.push(`${activity.title} (Media)`);
        }
    }
    headers.push('Promedio Total');

    const rows: string[][] = students.map(student => {
        const row: string[] = [student.name];
        for (const activity of activitiesWithSteps) {
            for (const step of activity.evaluableSteps) {
                const { grade } = computeStepGrade(student.student_id, step.id);
                row.push(grade !== null ? String(grade) : '');
            }
            if (activity.evaluableSteps.length > 1) {
                const avg = computeActivityGrade(student.student_id, activity.id);
                row.push(avg !== null ? String(avg) : '');
            }
        }
        const total = computeTotal(student.student_id);
        row.push(total !== null ? String(total) : '');
        return row;
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas-${unitName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
