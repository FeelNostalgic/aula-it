"use client";

import { useState, useRef, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { parseCsv, guessScoreColumn, guessStudentIdColumn, parseScore } from "@/lib/google-form-csv-parser";
import { getStudentProfilesForImport, importGoogleFormResults } from "@/app/activities/[id]/edit/actions";
import { cn } from "@/lib/utils";

interface GoogleFormCsvImportProps {
    stepId: string;
    open: boolean;
    onClose: () => void;
}

type Profile = { id: string; full_name: string };

type MatchedRow = {
    csvRow: Record<string, string>;
    studentId: string;
    studentName: string;
    pointsEarned: number;
    pointsTotal: number;
};

type UnmatchedRow = {
    csvRow: Record<string, string>;
    rawId: string;
};

export function GoogleFormCsvImport({ stepId, open, onClose }: GoogleFormCsvImportProps) {
    const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [idColumn, setIdColumn] = useState<string>('');
    const [scoreColumn, setScoreColumn] = useState<string>('');
    const [maxScore, setMaxScore] = useState<string>('10');
    const [matched, setMatched] = useState<MatchedRow[]>([]);
    const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleClose() {
        setStep('upload');
        setHeaders([]);
        setRows([]);
        setIdColumn('');
        setScoreColumn('');
        setMatched([]);
        setUnmatched([]);
        onClose();
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const { headers: h, rows: r } = parseCsv(text);
        if (!h.length) { toast.error("No se pudo leer el CSV."); return; }

        // Fetch student profiles for matching
        const result = await getStudentProfilesForImport(stepId);
        if (result.error) { toast.error(result.error); return; }

        const profs = result.profiles;
        setProfiles(profs);
        setHeaders(h);
        setRows(r);

        const guessedScore = guessScoreColumn(h, r) ?? '';
        const guessedId = guessStudentIdColumn(h, r, profs.map(p => p.full_name)) ?? '';
        setScoreColumn(guessedScore);
        setIdColumn(guessedId);
        setStep('map');
    }

    function handleBuildPreview() {
        if (!idColumn || !scoreColumn) { toast.error("Selecciona las columnas de ID y puntuación."); return; }
        const total = parseFloat(maxScore);
        if (isNaN(total) || total <= 0) { toast.error("Introduce un total de puntos válido."); return; }

        const nameMap = new Map(profiles.map(p => [p.full_name.toLowerCase(), p]));
        const m: MatchedRow[] = [];
        const u: UnmatchedRow[] = [];

        for (const row of rows) {
            const rawId = (row[idColumn] ?? '').trim();
            const profile = nameMap.get(rawId.toLowerCase());
            const rawScore = row[scoreColumn] ?? '';
            const pts = parseScore(rawScore);
            if (profile && pts !== null) {
                m.push({ csvRow: row, studentId: profile.id, studentName: profile.full_name, pointsEarned: pts, pointsTotal: total });
            } else {
                u.push({ csvRow: row, rawId });
            }
        }
        setMatched(m);
        setUnmatched(u);
        setStep('preview');
    }

    function handleImport() {
        startTransition(async () => {
            const payload = matched.map(r => ({ studentId: r.studentId, pointsEarned: r.pointsEarned, pointsTotal: r.pointsTotal }));
            const result = await importGoogleFormResults(stepId, payload);
            if (result.error) { toast.error(result.error); return; }
            toast.success(`${result.imported} resultado${result.imported !== 1 ? 's' : ''} importado${result.imported !== 1 ? 's' : ''} correctamente.`);
            handleClose();
        });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importar resultados desde Google Forms CSV</DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <p className="text-sm text-text-muted">
                            Exporta las respuestas desde Google Forms (Respuestas → descargar CSV) y súbelo aquí.
                            Asegúrate de que el formulario tenga una pregunta donde el alumno introduce su ID de alumno.
                        </p>
                        <div
                            className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:bg-surface-dark/30 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="size-8 text-text-muted/30 mx-auto mb-2" />
                            <p className="text-sm text-text-muted">Haz clic para seleccionar el archivo CSV</p>
                            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                        </div>
                    </div>
                )}

                {step === 'map' && (
                    <div className="space-y-5">
                        <p className="text-sm text-text-muted">{rows.length} filas detectadas. Configura los campos para el mapeo:</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">Columna de ID de alumno</Label>
                                <select
                                    value={idColumn}
                                    onChange={(e) => setIdColumn(e.target.value)}
                                    className="w-full h-9 text-sm bg-surface border border-border rounded-md px-3 text-foreground"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">Columna de puntuación</Label>
                                <select
                                    value={scoreColumn}
                                    onChange={(e) => setScoreColumn(e.target.value)}
                                    className="w-full h-9 text-sm bg-surface border border-border rounded-md px-3 text-foreground"
                                >
                                    <option value="">— Seleccionar —</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">Puntuación máxima posible</Label>
                            <Input
                                type="number"
                                min={1}
                                value={maxScore}
                                onChange={(e) => setMaxScore(e.target.value)}
                                className="w-32 bg-surface border-border font-mono"
                            />
                            <p className="text-xs text-text-muted/70">Total de puntos del formulario (para calcular la nota sobre 10).</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setStep('upload')} className="border-border-strong">Atrás</Button>
                            <Button onClick={handleBuildPreview} className="bg-accent-blue hover:bg-accent-blue/90 text-white">Vista previa</Button>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-4">
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="size-4" />
                                <span>{matched.length} alumnos encontrados</span>
                            </div>
                            {unmatched.length > 0 && (
                                <div className="flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="size-4" />
                                    <span>{unmatched.length} filas sin coincidencia</span>
                                </div>
                            )}
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-border/50 rounded-xl">
                            <table className="w-full text-xs">
                                <thead className="bg-surface-dark sticky top-0">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-text-muted font-semibold">Alumno</th>
                                        <th className="text-right px-3 py-2 text-text-muted font-semibold">Puntos</th>
                                        <th className="text-right px-3 py-2 text-text-muted font-semibold">Nota /10</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matched.map((r, i) => (
                                        <tr key={i} className={cn("border-t border-border/30", i % 2 === 0 ? "bg-surface/30" : "")}>
                                            <td className="px-3 py-1.5 font-medium text-foreground">{r.studentName}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-text-muted">{r.pointsEarned}/{r.pointsTotal}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-accent-blue">
                                                {(Math.round(r.pointsEarned / r.pointsTotal * 1000) / 100).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {unmatched.map((r, i) => (
                                        <tr key={`u-${i}`} className="border-t border-border/30 bg-amber-500/5">
                                            <td className="px-3 py-1.5 text-amber-400 italic" colSpan={3}>
                                                Sin coincidencia: "{r.rawId || "(vacío)"}"
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {matched.length === 0 && (
                            <p className="text-sm text-amber-400 flex items-center gap-2">
                                <AlertTriangle className="size-4 shrink-0" />
                                No se encontraron coincidencias. Verifica que la columna de ID contiene los nombres de alumno correctos.
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setStep('map')} className="border-border-strong">Atrás</Button>
                            <Button
                                onClick={handleImport}
                                disabled={matched.length === 0 || isPending}
                                className="bg-accent-blue hover:bg-accent-blue/90 text-white"
                            >
                                {isPending
                                    ? <><RefreshCw className="size-4 animate-spin mr-2" />Importando...</>
                                    : `Importar ${matched.length} resultado${matched.length !== 1 ? 's' : ''}`
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
