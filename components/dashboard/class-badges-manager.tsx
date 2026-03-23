"use client";

import { useState, useMemo } from "react";
import { Award, Plus, Trash2, Edit2, CheckCircle, XCircle, HardDrive, List, LayoutGrid, AlertCircle, UserCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClassBadge, updateClassBadge, deleteClassBadge, getUnitStudentsWithBadges, awardBadgesManually } from "@/app/dashboard/units/[id]/actions";
import { ClassBadge } from "@/types/database";
import { BadgeDisplay } from "./badge-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";

// Triggers that have no operator/value (boolean conditions)
const BOOLEAN_TRIGGERS = new Set([
    'specific_activity_completed',
    'first_to_submit',
    'perfect_score',
    'no_retries',
    'all_activities_completed',
]);

// Triggers that need only a value (no operator select)
const VALUE_ONLY_TRIGGERS = new Set(['improvement', 'fastest_completion']);

interface StepRef { id: string; title: string; type: string }

interface ClassBadgesManagerProps {
    badges: ClassBadge[];
    unitId: string;
    activityId?: string;
    steps?: StepRef[];
}

export default function ClassBadgesManager({ badges, unitId, activityId, steps = [] }: ClassBadgesManagerProps) {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [badgeToDelete, setBadgeToDelete] = useState<string | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [isHidden, setIsHidden] = useState(true);
    const [conditionField, setConditionField] = useState(activityId ? "score" : "unit_completion");
    const [conditionOperator, setConditionOperator] = useState("gte");
    const [conditionValue, setConditionValue] = useState("100");
    const [xpReward, setXpReward] = useState("0");
    const [activeTab, setActiveTab] = useState("general");
    const [stepId, setStepId] = useState<string | null>(null);
    const [assignTo, setAssignTo] = useState<'reto' | 'actividad'>('reto');
    // Manager-level tabs (CRUD vs manual award)
    const [managerTab, setManagerTab] = useState<'badges' | 'award'>('badges');
    const [studentsData, setStudentsData] = useState<{ students: any[]; studentBadges: any[] } | null>(null);
    const [selectedBadgeForAward, setSelectedBadgeForAward] = useState<string>('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isAwarding, setIsAwarding] = useState(false);

    const filteredBadges = useMemo(() => {
        if (activityId) {
            return badges.filter(b => b.activity_id === activityId);
        }
        return badges.filter(b => b.activity_id === null);
    }, [badges, activityId]);

    const buildPayload = () => {
        if (BOOLEAN_TRIGGERS.has(conditionField)) {
            return { allOf: [{ field: conditionField, operator: 'eq', value: true }] };
        }
        if (VALUE_ONLY_TRIGGERS.has(conditionField)) {
            return { allOf: [{ field: conditionField, operator: 'gte', value: parseInt(conditionValue, 10) || 50 }] };
        }
        return { allOf: [{ field: conditionField, operator: conditionOperator, value: parseInt(conditionValue, 10) || 100 }] };
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setIconUrl("");
        setIsHidden(true);
        setConditionField(activityId ? "score" : "unit_completion");
        setConditionOperator("gte");
        setConditionValue("100");
        setXpReward("0");
        setStepId(null);
        setAssignTo('reto');
        setIsCreating(false);
        setIsEditing(null);
        setActiveTab("general");
    };

    const handleCreate = async () => {
        if (!title) return toast.error("El título es obligatorio");
        setIsLoading(true);

        const { error } = await createClassBadge(unitId, {
            title,
            description,
            icon_url: iconUrl || null,
            is_hidden: isHidden,
            condition_payload: buildPayload(),
            activity_id: activityId || null,
            step_id: stepId || null,
            xp_reward: parseInt(xpReward, 10) || 0
        });

        setIsLoading(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia creada");
            resetForm();
        }
    };

    const handleUpdate = async (id: string) => {
        if (!title) return toast.error("El título es obligatorio");
        setIsLoading(true);

        const { error } = await updateClassBadge(id, unitId, {
            title,
            description,
            icon_url: iconUrl || null,
            is_hidden: isHidden,
            condition_payload: buildPayload(),
            activity_id: activityId || null,
            step_id: stepId || null,
            xp_reward: parseInt(xpReward, 10) || 0
        });

        setIsLoading(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia actualizada");
            setIsEditing(null);
        }
    };

    const handleDelete = (id: string) => {
        setBadgeToDelete(id);
    };

    const confirmDelete = async () => {
        if (!badgeToDelete) return;
        setIsLoading(true);
        
        const { error } = await deleteClassBadge(badgeToDelete, unitId);
        
        setIsLoading(false);
        setBadgeToDelete(null);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Insignia eliminada");
        }
    };

    const startEdit = (badge: ClassBadge) => {
        setIsEditing(badge.id);
        setIsCreating(false);
        setTitle(badge.title);
        setDescription(badge.description || "");
        setIconUrl(badge.icon_url || "");
        setIsHidden(badge.is_hidden);
        setXpReward(badge.xp_reward?.toString() || "0");
        setStepId(badge.step_id ?? null);
        setAssignTo(badge.step_id ? 'actividad' : 'reto');

        try {
            const payload: any = badge.condition_payload;
            const condition = payload?.allOf?.[0] || payload?.all?.[0] || payload?.[0];
            if (condition) {
                setConditionField(condition.field || condition.fact?.replace('submission.', '') || "score");
                setConditionOperator(condition.operator || "gte");
                setConditionValue(condition.value?.toString() || "100");
            }
        } catch (e) {
            // default
        }
    };

    const getConditionDescription = (badge: ClassBadge) => {
        try {
            const payload: any = badge.condition_payload;
            const condition = payload?.allOf?.[0] || payload?.all?.[0] || payload?.[0];
            if (!condition) return "Sin condición";
            
            const field = condition.field || condition.fact?.replace('submission.', '');
            const op = condition.operator;
            const val = condition.value;
            
            const fieldLabels: Record<string, string> = {
                score: "Nota",
                average_score: "Media",
                unit_completion: "Progreso",
                specific_activity_completed: "Completar actividad",
                first_attempt_score: "Nota 1er Intento",
                steps_completed: "Actividades completadas",
                activities_completed: "Actividades",
                total_xp: "XP",
                streak_days: "Racha",
                first_to_submit: "Primero en entregar",
                perfect_score: "Nota perfecta",
                no_retries: "Sin reintentos",
                improvement: "Mejora con aprobado",
                fastest_completion: "Completado más rápido",
                all_activities_completed: "Todos los retos completados",
                top_rank: "Rango alcanzado",
                consecutive_perfect: "Perfectos consecutivos",
            };
            const fieldLabel = fieldLabels[field] || field;

            if (BOOLEAN_TRIGGERS.has(field)) return fieldLabel;
            
            let opLabel = "";
            if (op === 'eq') opLabel = "=";
            else if (op === 'gt') opLabel = ">";
            else if (op === 'gte') opLabel = "≥";
            else if (op === 'lt') opLabel = "<";
            else if (op === 'lte') opLabel = "≤";

            const isPercentage = ['score', 'average_score', 'unit_completion', 'first_attempt_score'].includes(field);
            return `${fieldLabel} ${opLabel} ${val}${isPercentage ? '%' : ''}`;
        } catch (e) {
            return "Condición personalizada";
        }
    };

    const loadStudents = async () => {
        if (studentsData || isLoadingStudents) return;
        setIsLoadingStudents(true);
        const result = await getUnitStudentsWithBadges(unitId);
        setStudentsData(result.error ? { students: [], studentBadges: [] } : result);
        if (!selectedBadgeForAward && filteredBadges.length > 0) {
            setSelectedBadgeForAward(filteredBadges[0].id);
        }
        setIsLoadingStudents(false);
    };

    const handleManagerTabChange = (tab: string) => {
        setManagerTab(tab as 'badges' | 'award');
        if (tab === 'award') loadStudents();
    };

    const handleAward = async () => {
        if (!selectedBadgeForAward || selectedStudentIds.size === 0) return;
        setIsAwarding(true);
        const result = await awardBadgesManually(selectedBadgeForAward, Array.from(selectedStudentIds));
        setIsAwarding(false);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Insignia otorgada a ${result.awarded ?? selectedStudentIds.size} alumno(s)`);
            setSelectedStudentIds(new Set());
            // Refresh student badge data
            const refreshed = await getUnitStudentsWithBadges(unitId);
            setStudentsData(refreshed.error ? studentsData : refreshed);
        }
    };

    const awardBadge = filteredBadges.find(b => b.id === selectedBadgeForAward);
    const earnedStudentIds = new Set(
        studentsData?.studentBadges.filter(sb => sb.badge_id === selectedBadgeForAward).map(sb => sb.student_id) ?? []
    );

    return (
        <div className="space-y-6">
            {/* Manager-level tabs: Insignias | Entrega Manual */}
            <div className="flex items-center gap-1 bg-surface border border-border/50 rounded-lg p-1 w-fit">
                <button
                    onClick={() => handleManagerTabChange('badges')}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                        managerTab === 'badges' ? "bg-background shadow-sm text-foreground" : "text-text-muted hover:text-foreground"
                    )}
                >
                    Insignias
                </button>
                <button
                    onClick={() => handleManagerTabChange('award')}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5",
                        managerTab === 'award' ? "bg-background shadow-sm text-foreground" : "text-text-muted hover:text-foreground"
                    )}
                >
                    <UserCheck className="size-3" />
                    Entrega Manual
                </button>
            </div>

            {/* ENTREGA MANUAL tab */}
            {managerTab === 'award' && (
                <div className="space-y-5">
                    {filteredBadges.length === 0 ? (
                        <div className="py-16 text-center text-text-muted text-sm">No hay insignias creadas todavía.</div>
                    ) : (
                        <>
                            {/* Badge selector */}
                            <div className="space-y-2">
                                <Label className="text-xs text-text-muted uppercase tracking-widest font-bold">Insignia a otorgar</Label>
                                <div className="flex flex-wrap gap-2">
                                    {filteredBadges.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => { setSelectedBadgeForAward(b.id); setSelectedStudentIds(new Set()); }}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                                selectedBadgeForAward === b.id
                                                    ? "bg-accent-blue/10 border-accent-blue/50 text-accent-blue"
                                                    : "bg-surface border-border/50 text-text-muted hover:border-border hover:text-foreground"
                                            )}
                                        >
                                            {b.icon_url
                                                ? <img src={b.icon_url} alt="" className="size-4 object-contain shrink-0" />
                                                : <Award className="size-4 text-amber-500 shrink-0" />
                                            }
                                            {b.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Student list */}
                            {isLoadingStudents ? (
                                <div className="py-10 text-center text-text-muted text-sm">Cargando alumnos...</div>
                            ) : studentsData && studentsData.students.length === 0 ? (
                                <div className="py-10 text-center text-text-muted text-sm">No hay alumnos matriculados.</div>
                            ) : studentsData && selectedBadgeForAward ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-text-muted uppercase tracking-widest font-bold">Alumnos</Label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const notEarned = studentsData.students.filter(s => !earnedStudentIds.has(s.id)).map(s => s.id);
                                                    setSelectedStudentIds(new Set(notEarned));
                                                }}
                                                className="text-[10px] text-accent-blue hover:underline font-bold"
                                            >
                                                Seleccionar todos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStudentIds(new Set())}
                                                className="text-[10px] text-text-muted hover:underline"
                                            >
                                                Deseleccionar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const refreshed = await getUnitStudentsWithBadges(unitId);
                                                    setStudentsData(refreshed.error ? studentsData : refreshed);
                                                }}
                                                className="text-[10px] text-text-muted hover:text-foreground"
                                            >
                                                <RefreshCw className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                        {studentsData.students.map(student => {
                                            const alreadyEarned = earnedStudentIds.has(student.id);
                                            const isSelected = selectedStudentIds.has(student.id);
                                            return (
                                                <button
                                                    key={student.id}
                                                    type="button"
                                                    disabled={alreadyEarned}
                                                    onClick={() => {
                                                        if (alreadyEarned) return;
                                                        setSelectedStudentIds(prev => {
                                                            const next = new Set(prev);
                                                            next.has(student.id) ? next.delete(student.id) : next.add(student.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all text-left",
                                                        alreadyEarned
                                                            ? "bg-accent-green/5 border-accent-green/20 cursor-default"
                                                            : isSelected
                                                                ? "bg-accent-blue/10 border-accent-blue/30"
                                                                : "bg-surface border-border/30 hover:border-border/60"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "size-4 rounded border-2 shrink-0 flex items-center justify-center",
                                                        alreadyEarned ? "border-accent-green bg-accent-green/10" : isSelected ? "border-accent-blue bg-accent-blue" : "border-border/50"
                                                    )}>
                                                        {(alreadyEarned || isSelected) && <CheckCircle className="size-3 text-white" />}
                                                    </div>
                                                    {student.avatar_url && (
                                                        <img src={student.avatar_url} alt="" className="size-6 rounded-full shrink-0" />
                                                    )}
                                                    <span className={cn("flex-1 font-medium", alreadyEarned ? "text-text-muted" : "text-foreground")}>
                                                        {student.full_name || "Sin nombre"}
                                                    </span>
                                                    {alreadyEarned && (
                                                        <span className="text-[10px] text-accent-green font-bold uppercase tracking-widest shrink-0">✓ Ganada</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-3">
                                        <Button
                                            onClick={handleAward}
                                            disabled={isAwarding || selectedStudentIds.size === 0}
                                            className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-10 px-6 uppercase gap-2"
                                        >
                                            <UserCheck className="size-4" />
                                            {isAwarding ? "OTORGANDO..." : `OTORGAR A ${selectedStudentIds.size} ALUMNO${selectedStudentIds.size !== 1 ? 'S' : ''}`}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            )}

            {/* INSIGNIAS tab */}
            {managerTab === 'badges' && (<>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">
                        {activityId ? 'Insignias del Reto' : 'Gestión de Insignias Globales'}
                    </h3>
                    <p className="text-sm text-text-muted">
                        {activityId
                            ? 'Crea insignias específicas para este reto.'
                            : 'Crea insignias globales para toda la unidad.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase"
                    >
                        <Plus className="mr-2 size-4" />
                        NUEVA INSIGNIA
                    </Button>
                </div>
            </div>

            {(isCreating || !!isEditing) && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            )}
            <Dialog
                open={isCreating || !!isEditing}
                onOpenChange={(open) => !open && resetForm()}
                modal={false}
            >
                <DialogContent
                    className="max-w-3xl bg-surface border-border-strong p-0 overflow-hidden z-50"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>{isEditing ? "Editar Insignia" : "Nueva Insignia"}</DialogTitle>
                        <DialogDescription>Configura los detalles y las reglas de obtención.</DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[620px]">
                        <div className="px-6 border-b border-border/50 shrink-0">
                            <TabsList className="bg-transparent gap-6 p-0 h-12">
                                <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:bg-transparent px-2 h-full">General</TabsTrigger>
                                <TabsTrigger value="obtention" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:bg-transparent px-2 h-full">Obtención</TabsTrigger>
                                <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:bg-transparent px-2 h-full">Vista Previa</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <TabsContent value="general" className="mt-0 space-y-6">
                                <div className="grid md:grid-cols-[120px_1fr] gap-8">
                                    <div className="space-y-4">
                                        <div className="aspect-square rounded-2xl bg-surface-dark border border-border/50 flex items-center justify-center overflow-hidden relative group">
                                            {iconUrl ? (
                                                <img src={iconUrl} alt="Icono" className="size-full object-contain p-4" />
                                            ) : (
                                                <Award className="size-12 text-text-muted/20" />
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="size-8 text-white hover:bg-white/20"
                                                    onClick={async () => {
                                                        const files = await openPicker();
                                                        if (files?.[0]) setIconUrl(files[0].url);
                                                    }}
                                                    disabled={isDriveLoading}
                                                >
                                                    <HardDrive className="size-4" />
                                                </Button>
                                                {iconUrl && (
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="size-8 text-white hover:bg-white/20"
                                                        onClick={() => setIconUrl("")}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-center text-text-muted leading-tight">
                                            Usa el icono por defecto o sube uno propio.
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="badge-title">Título de la Insignia</Label>
                                            <Input id="badge-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Francotirador Visual" className="bg-surface-dark border-border/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="badge-description">Descripción</Label>
                                            <Textarea id="badge-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe qué significa esta insignia..." className="bg-surface-dark border-border/50 resize-none h-24" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="badge-xp">XP de Recompensa</Label>
                                                <Input id="badge-xp" type="number" min="0" value={xpReward} onChange={e => setXpReward(e.target.value)} className="bg-surface-dark border-border/50" />
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <div className="flex items-center justify-between p-3 bg-surface-dark border border-border/50 rounded-lg h-[40px]">
                                                    <Label className="text-xs cursor-pointer" htmlFor="hide-badge">Ocultar hasta ganar</Label>
                                                    <input 
                                                        id="hide-badge"
                                                        type="checkbox" 
                                                        className="size-4 rounded accent-accent-blue"
                                                        checked={isHidden} 
                                                        onChange={e => setIsHidden(e.target.checked)} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-accent-blue hover:text-accent-blue/80 gap-2 font-bold p-0"
                                                onClick={() => setActiveTab("preview")}
                                            >
                                                Ver Vista Previa →
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="obtention" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Regla de Desbloqueo</Label>
                                    <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-surface-dark/50">

                                        {/* ASIGNAR A — solo cuando es badge de reto con steps disponibles */}
                                        {activityId && steps.length > 0 && (
                                            <div className="space-y-2 pb-4 border-b border-border/30">
                                                <Label className="text-xs text-text-muted">Asignar a</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAssignTo('reto'); setStepId(null); setConditionField('score'); }}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg border text-xs font-bold transition-all text-left",
                                                            assignTo === 'reto'
                                                                ? "bg-accent-blue/10 border-accent-blue/50 text-accent-blue"
                                                                : "bg-surface border-border/50 text-text-muted hover:border-border"
                                                        )}
                                                    >
                                                        Reto completo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAssignTo('actividad'); setConditionField('no_retries'); }}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg border text-xs font-bold transition-all text-left",
                                                            assignTo === 'actividad'
                                                                ? "bg-accent-blue/10 border-accent-blue/50 text-accent-blue"
                                                                : "bg-surface border-border/50 text-text-muted hover:border-border"
                                                        )}
                                                    >
                                                        Actividad específica
                                                    </button>
                                                </div>
                                                {assignTo === 'actividad' && (
                                                    <Select value={stepId ?? ''} onValueChange={v => setStepId(v || null)}>
                                                        <SelectTrigger className="w-full bg-surface border-border/50 h-10 mt-1">
                                                            <SelectValue placeholder="Selecciona una actividad" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-surface border-border-strong">
                                                            {steps.map(s => (
                                                                <SelectItem key={s.id} value={s.id}>
                                                                    {s.title} <span className="text-text-muted ml-1">({s.type})</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        )}

                                        {/* PROPIEDAD A EVALUAR */}
                                        <div className="space-y-2">
                                            <Label className="text-xs text-text-muted">Propiedad a evaluar</Label>
                                            <Select value={conditionField} onValueChange={setConditionField}>
                                                <SelectTrigger className="w-full bg-surface border-border/50 h-10">
                                                    <SelectValue placeholder="Selecciona propiedad" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface border-border-strong">
                                                    {activityId ? (
                                                        (steps.length === 0 || assignTo === 'actividad') ? (
                                                            <>
                                                                <SelectItem value="no_retries">Aprobado sin Reintentos</SelectItem>
                                                                <SelectItem value="perfect_score">Nota Perfecta (100%)</SelectItem>
                                                                <SelectItem value="first_to_submit">Primero en Entregar</SelectItem>
                                                                <SelectItem value="first_attempt_score">Nota Primer Intento (0-100)</SelectItem>
                                                                <SelectItem value="score">Nota de esta Actividad (0-100)</SelectItem>
                                                                <SelectItem value="improvement">Mejora con Aprobado (nota mínima)</SelectItem>
                                                                <SelectItem value="fastest_completion">Completado más Rápido (top N)</SelectItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <SelectItem value="score">Nota del Reto (0-100)</SelectItem>
                                                                <SelectItem value="steps_completed">Actividades Completadas</SelectItem>
                                                                <SelectItem value="specific_activity_completed">Completar este Reto</SelectItem>
                                                                <SelectItem value="improvement">Mejora con Aprobado (nota mínima)</SelectItem>
                                                                <SelectItem value="fastest_completion">Completado más Rápido (top N)</SelectItem>
                                                            </>
                                                        )
                                                    ) : (
                                                        <>
                                                            <SelectItem value="average_score">Nota Media Unidad (0-100)</SelectItem>
                                                            <SelectItem value="unit_completion">% Completado Unidad (0-100)</SelectItem>
                                                            <SelectItem value="activities_completed">Actividades completadas</SelectItem>
                                                            <SelectItem value="total_xp">XP Total Acumulado</SelectItem>
                                                            <SelectItem value="streak_days">Racha de Días</SelectItem>
                                                            <SelectItem value="all_activities_completed">Todos los Retos Completados</SelectItem>
                                                            <SelectItem value="top_rank">Alcanzar Rango X</SelectItem>
                                                            <SelectItem value="consecutive_perfect">Perfectos Consecutivos</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Boolean triggers: info box */}
                                        {BOOLEAN_TRIGGERS.has(conditionField) && (
                                            <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                                                <p className="text-xs text-accent-blue font-medium leading-relaxed">
                                                    {conditionField === 'specific_activity_completed' && "La insignia se otorgará automáticamente al completar satisfactoriamente este reto."}
                                                    {conditionField === 'first_to_submit' && "La insignia se otorgará al primer alumno en entregar esta actividad."}
                                                    {conditionField === 'perfect_score' && "La insignia se otorgará al alumno que obtenga 100% en esta actividad."}
                                                    {conditionField === 'no_retries' && "La insignia se otorgará al alumno que apruebe al primer intento."}
                                                    {conditionField === 'all_activities_completed' && "La insignia se otorgará cuando el alumno complete todos los retos de la unidad."}
                                                </p>
                                            </div>
                                        )}

                                        {/* Value-only triggers */}
                                        {VALUE_ONLY_TRIGGERS.has(conditionField) && (
                                            <div className="space-y-4 pt-4 border-t border-border/30">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-text-muted">
                                                        {conditionField === 'improvement' ? "Nota mínima tras la mejora (%)" : "Posición máxima (top N)"}
                                                    </Label>
                                                    <div className="relative">
                                                        <Input type="number" min="1" max={conditionField === 'improvement' ? 100 : undefined} value={conditionValue} onChange={e => setConditionValue(e.target.value)} className="bg-surface border-border/50 pr-8 h-10" />
                                                        {conditionField === 'improvement' && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">%</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-muted/70">
                                                        {conditionField === 'improvement'
                                                            ? "El alumno debe mejorar su nota Y la nueva nota debe ser ≥ este valor."
                                                            : "El alumno debe ser uno de los N primeros en completar."}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Numeric triggers with operator */}
                                        {!BOOLEAN_TRIGGERS.has(conditionField) && !VALUE_ONLY_TRIGGERS.has(conditionField) && (
                                            <div className="space-y-4 pt-4 border-t border-border/30">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-text-muted">Operador</Label>
                                                    <Select value={conditionOperator} onValueChange={setConditionOperator}>
                                                        <SelectTrigger className="w-full bg-surface border-border/50 h-10">
                                                            <SelectValue placeholder="Selecciona operador" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-surface border-border-strong">
                                                            <SelectItem value="eq">Es igual a (=)</SelectItem>
                                                            <SelectItem value="gt">Es mayor que (&gt;)</SelectItem>
                                                            <SelectItem value="gte">Es mayor o igual que (≥)</SelectItem>
                                                            <SelectItem value="lt">Es menor que (&lt;)</SelectItem>
                                                            <SelectItem value="lte">Es menor o igual que (≤)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-text-muted">Valor Requerido</Label>
                                                    <div className="relative">
                                                        <Input type="number" min="0" value={conditionValue} onChange={e => setConditionValue(e.target.value)} className="bg-surface border-border/50 pr-8 h-10" />
                                                        {(['score', 'unit_completion', 'average_score', 'first_attempt_score'].includes(conditionField)) && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">%</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-accent-blue hover:text-accent-blue/80 gap-2 font-bold p-0"
                                            onClick={() => setActiveTab("preview")}
                                        >
                                            Ver Vista Previa →
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="preview" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-base font-bold text-center block">Vista Previa de la Insignia</Label>
                                    <div className="bg-surface-dark/50 border border-border/50 rounded-xl p-10 flex flex-col items-center justify-center gap-10 min-h-[300px]">
                                        <div className="flex flex-col sm:flex-row gap-12 sm:gap-20">
                                            <div className="text-center space-y-3">
                                                <BadgeDisplay 
                                                    badge={{ id: "preview", title: title || "Vista Previa", description, icon_url: iconUrl || null, is_hidden: isHidden } as any}
                                                    isEarned={true}
                                                />
                                                <div className="px-3 py-1 bg-accent-green/10 border border-accent-green/20 rounded-full">
                                                    <span className="text-[10px] font-bold text-accent-green uppercase tracking-wider block">Desbloqueada</span>
                                                </div>
                                            </div>
                                            <div className="text-center space-y-3">
                                                <BadgeDisplay 
                                                    badge={{ id: "preview2", title: title || "Vista Previa", description, icon_url: iconUrl || null, is_hidden: isHidden } as any}
                                                    isEarned={false}
                                                />
                                                <div className="px-3 py-1 bg-surface border border-border/50 rounded-full">
                                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Bloqueada</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="max-w-md text-center space-y-2">
                                            <h4 className="font-bold text-foreground">{title || "Sin título"}</h4>
                                            <p className="text-sm text-text-muted italic">{description || "Sin descripción"}</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <DialogFooter className="p-6 bg-surface-dark/50 border-t border-border/50">
                        <Button variant="ghost" onClick={resetForm} disabled={isLoading}>Cancelar</Button>
                        <Button
                            onClick={() => isEditing ? handleUpdate(isEditing) : handleCreate()}
                            disabled={isLoading || !title}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8"
                        >
                            {isLoading ? "GUARDANDO..." : "GUARDAR INSIGNIA"}
                        </Button>
                    </DialogFooter>                </DialogContent>
            </Dialog>

            <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"
            )}>
                {filteredBadges.map(badge => (
                    <Card key={badge.id} className={cn(
                        "group relative overflow-hidden transition-all duration-300 border-border/50 hover:border-accent-blue/30 bg-surface/50 backdrop-blur-sm",
                        viewMode === 'list' && "hover:bg-surface"
                    )}>
                        <CardContent className={cn(
                            "p-4 h-full flex transition-all duration-300",
                            viewMode === 'grid' ? "flex-col items-center text-center gap-3" : "flex-row items-center gap-5"
                        )}>
                            <div className={cn(
                                "relative shrink-0",
                                viewMode === 'grid' ? "mb-0" : ""
                            )}>
                                <BadgeDisplay 
                                    badge={badge} 
                                    isEarned={true} 
                                    variant="compact" 
                                    className={cn(
                                        "size-12 p-0! bg-transparent! border-0! transition-none opacity-100! grayscale-0!",
                                        viewMode === 'list' ? "size-10" : ""
                                    )} 
                                />
                                {badge.is_hidden && (
                                    <div className="absolute -top-1 -right-1 size-4 bg-accent-orange text-white rounded-full flex items-center justify-center shadow-lg border-2 border-surface">
                                        <XCircle className="size-2.5" />
                                    </div>
                                )}
                            </div>
                            
                            <div className={cn(
                                "space-y-1 flex-1 min-w-0",
                                viewMode === 'grid' && "items-center flex flex-col"
                            )}>
                                <h4 className="font-bold text-xs truncate w-full group-hover:text-accent-blue transition-colors">{badge.title}</h4>
                                {badge.description && (
                                    <p className="text-[10px] text-text-muted line-clamp-1 italic mb-1">
                                        {badge.description}
                                    </p>
                                )}
                                <div className={cn(
                                    "flex flex-wrap gap-1.5",
                                    viewMode === 'grid' ? "justify-center" : "justify-start"
                                )}>
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-dark/50 border border-border/30 rounded text-[9px] font-bold text-text-muted">
                                        <Award className="size-2.5 text-accent-blue" />
                                        {getConditionDescription(badge)}
                                    </div>
                                    {badge.xp_reward > 0 && (
                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent-purple/5 border border-accent-purple/20 rounded text-[9px] font-black text-accent-purple uppercase tracking-tight">
                                            +{badge.xp_reward} XP
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={cn(
                                "flex items-center gap-1",
                                viewMode === 'grid' ? "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0" : "shrink-0 ml-auto"
                            )}>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-8 rounded-lg bg-surface/50 backdrop-blur-md border border-border/10 hover:bg-accent-blue/10 hover:text-accent-blue hover:border-accent-blue/20" 
                                    onClick={() => startEdit(badge)}
                                >
                                    <Edit2 className="size-3.5" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-8 rounded-lg bg-surface/50 backdrop-blur-md border border-border/10 hover:bg-status-offline/10 hover:text-status-offline hover:border-status-offline/20" 
                                    onClick={() => handleDelete(badge.id)}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {filteredBadges.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4 bg-surface-dark/30 rounded-2xl border border-dashed border-border/50">
                        <div className="size-16 mx-auto bg-surface-dark border border-border/50 rounded-2xl flex items-center justify-center opacity-40">
                            <Award className="size-8 text-text-muted" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-foreground">No hay insignias {activityId ? 'para este reto' : 'globales'}</p>
                            <p className="text-sm text-text-muted max-w-[300px] mx-auto">Comienza creando una insignia para motivar el progreso de tus alumnos.</p>
                        </div>
                        <Button 
                            onClick={() => setIsCreating(true)} 
                            className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase"
                        >
                            <Plus className="size-4 mr-2" />
                            CREAR PRIMERA INSIGNIA
                        </Button>
                    </div>
                )}
            </div>
            </>)} {/* end managerTab === 'badges' */}

            <AlertDialog open={!!badgeToDelete} onOpenChange={(open) => !open && setBadgeToDelete(null)}>
                <AlertDialogContent className="bg-[#111111] border-border-strong rounded-[32px] p-8 max-w-[500px]">
                    <AlertDialogHeader className="flex-row items-center gap-4 space-y-0">
                        <div className="size-10 rounded-full border border-red-500/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="size-6 text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-white text-xl font-bold">
                            ¿Eliminar esta insignia?
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    
                    <AlertDialogDescription className="text-text-muted mt-4 text-base leading-relaxed">
                        Esta acción no se puede deshacer. Se eliminará permanentemente la insignia
                        <span className="text-white font-medium"> "{badges.find(b => b.id === badgeToDelete)?.title}"</span> y los alumnos podrían perderla.
                    </AlertDialogDescription>

                    <AlertDialogFooter className="mt-8 gap-3">
                        <AlertDialogCancel className="bg-transparent border-accent-blue text-white hover:bg-accent-blue/10 rounded-xl h-11 px-6">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-11 px-6"
                        >
                            Eliminar Insignia
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
