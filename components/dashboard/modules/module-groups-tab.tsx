"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import {
    Users2, Plus, Shuffle, Settings2, Trash2, UserMinus,
    GripVertical, ChevronDown, UsersRound, Pencil, Check, X,
} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
    closestCenter,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    getModuleGroups,
    getModuleGroupsEnrollmentMode,
    createGroup,
    updateGroup,
    deleteGroup,
    addStudentToGroup,
    removeStudentFromGroup,
    autoAssignGroups,
    setModuleGroupsMode,
} from "@/app/dashboard/modules/[id]/groups-actions";
import type { ModuleGroupWithMembers, GroupsEnrollmentMode } from "@/types/groups";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StudentBasic {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface ModuleGroupsTabProps {
    moduleId: string;
    enrolledStudents: StudentBasic[];
    canManageStudents: boolean;
}

// ─── Colores predefinidos para grupos ─────────────────────────────────────────

const GROUP_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

function getInitials(name: string | null): string {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Componente draggable de alumno ──────────────────────────────────────────

function DraggableStudent({ student, isDragOverlay = false }: { student: StudentBasic; isDragOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id });

    return (
        <div
            ref={isDragOverlay ? undefined : setNodeRef}
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-background cursor-grab active:cursor-grabbing select-none transition-all
                ${isDragging ? "opacity-40 border-border-subtle" : "border-border-subtle hover:border-accent-blue/50 hover:bg-accent-blue/5"}
                ${isDragOverlay ? "shadow-lg border-accent-blue/50 bg-accent-blue/5 cursor-grabbing" : ""}
            `}
        >
            <GripVertical className="size-3.5 text-text-muted shrink-0" />
            <Avatar className="size-6 shrink-0">
                <AvatarImage src={student.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] font-bold bg-surface">
                    {getInitials(student.full_name)}
                </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{student.full_name ?? student.email ?? "Alumno"}</span>
        </div>
    );
}

// ─── Componente droppable de grupo ───────────────────────────────────────────

function DroppableGroup({
    group,
    enrolledStudents,
    canManage,
    onRename,
    onDelete,
    onRemoveMember,
}: {
    group: ModuleGroupWithMembers;
    enrolledStudents: StudentBasic[];
    canManage: boolean;
    onRename: (groupId: string, name: string) => void;
    onDelete: (groupId: string) => void;
    onRemoveMember: (groupId: string, studentId: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: group.id });
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(group.name);

    const handleSaveName = () => {
        if (editName.trim() && editName !== group.name) {
            onRename(group.id, editName.trim());
        }
        setEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            className={`rounded-xl border transition-all ${isOver
                ? "border-accent-blue bg-accent-blue/5 shadow-md"
                : "border-border-subtle bg-surface"
            }`}
        >
            {/* Cabecera del grupo */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
                <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: group.color ?? "#6b7280" }}
                />
                {editing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveName();
                                if (e.key === "Escape") { setEditing(false); setEditName(group.name); }
                            }}
                            className="h-7 text-sm bg-background border-accent-blue/50 focus-visible:ring-accent-blue"
                            autoFocus
                        />
                        <Button size="icon" variant="ghost" className="size-6" onClick={handleSaveName}>
                            <Check className="size-3 text-accent-green" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6" onClick={() => { setEditing(false); setEditName(group.name); }}>
                            <X className="size-3 text-red-400" />
                        </Button>
                    </div>
                ) : (
                    <span className="font-semibold text-sm flex-1 truncate">{group.name}</span>
                )}
                <Badge variant="outline" className="font-mono text-[10px] border-border-subtle text-text-muted ml-auto shrink-0">
                    {group.members.length}{group.max_members ? `/${group.max_members}` : ""}
                </Badge>
                {canManage && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-6 shrink-0">
                                <ChevronDown className="size-3.5 text-text-muted" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface border-border-subtle">
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                                <Pencil className="mr-2 size-3.5" /> Renombrar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-400 focus:text-red-400"
                                onClick={() => onDelete(group.id)}
                            >
                                <Trash2 className="mr-2 size-3.5" /> Eliminar grupo
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Miembros */}
            <div className="p-3 min-h-[80px] flex flex-col gap-1.5">
                {group.members.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-lg border-2 border-dashed min-h-[56px] transition-colors
                        ${isOver ? "border-accent-blue/60 bg-accent-blue/5" : "border-border-subtle"}`}
                    >
                        <p className="text-xs text-text-muted">
                            {isOver ? "Soltar aquí" : "Arrastra alumnos aquí"}
                        </p>
                    </div>
                ) : (
                    <>
                        {group.members.map((member) => {
                            const profile = member.profile;
                            return (
                                <div
                                    key={member.student_id}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border-subtle group"
                                >
                                    <Avatar className="size-5 shrink-0">
                                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                                        <AvatarFallback className="text-[8px] font-bold bg-surface">
                                            {getInitials(profile?.full_name ?? null)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium flex-1 truncate">
                                        {profile?.full_name ?? "Alumno"}
                                    </span>
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => onRemoveMember(group.id, member.student_id)}
                                        >
                                            <UserMinus className="size-3 text-red-400" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                        {isOver && (
                            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-accent-blue/60 bg-accent-blue/5 h-9">
                                <p className="text-xs text-accent-blue">Soltar aquí</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Diálogo crear grupo ──────────────────────────────────────────────────────

function CreateGroupDialog({
    open,
    onOpenChange,
    onConfirm,
    enrollmentMode,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: (name: string, color: string, maxMembers?: number) => void;
    enrollmentMode: GroupsEnrollmentMode;
}) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(GROUP_COLORS[0]);
    const [maxMembers, setMaxMembers] = useState("");

    const handleConfirm = () => {
        if (!name.trim()) return;
        onConfirm(name.trim(), color, maxMembers ? parseInt(maxMembers) : undefined);
        setName("");
        setColor(GROUP_COLORS[0]);
        setMaxMembers("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-surface border-border-subtle sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm font-bold tracking-widest uppercase">
                        Nuevo Grupo
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-widest">Nombre</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Grupo Alpha"
                            className="bg-background border-border-subtle"
                            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-widest">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {GROUP_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`size-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    {enrollmentMode === "self_enrollment" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                                Máximo de miembros <span className="normal-case font-normal">(opcional)</span>
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={maxMembers}
                                onChange={(e) => setMaxMembers(e.target.value)}
                                placeholder="Sin límite"
                                className="bg-background border-border-subtle"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        className="bg-accent-blue hover:bg-accent-blue/90 text-white"
                    >
                        Crear grupo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Diálogo auto-asignación ──────────────────────────────────────────────────

function AutoAssignDialog({
    open,
    onOpenChange,
    onConfirm,
    totalStudents,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: (count: number) => void;
    totalStudents: number;
}) {
    const [count, setCount] = useState("4");
    const n = parseInt(count) || 0;
    const perGroup = n > 0 ? Math.ceil(totalStudents / n) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-surface border-border-subtle sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm font-bold tracking-widest uppercase">
                        Auto-asignación
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                            Número de grupos
                        </label>
                        <Input
                            type="number"
                            min={2}
                            max={totalStudents}
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            className="bg-background border-border-subtle"
                            autoFocus
                        />
                    </div>
                    {n > 0 && (
                        <div className="rounded-lg bg-accent-blue/10 border border-accent-blue/20 px-4 py-3 text-sm text-accent-blue">
                            <span className="font-semibold">{totalStudents} alumnos</span> se distribuirán en{" "}
                            <span className="font-semibold">{n} grupos</span> de aprox.{" "}
                            <span className="font-semibold">{perGroup}</span> miembros cada uno (distribución aleatoria).
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={() => { onConfirm(n); onOpenChange(false); }}
                        disabled={n < 2}
                        className="bg-accent-blue hover:bg-accent-blue/90 text-white"
                    >
                        <Shuffle className="mr-2 size-4" />
                        Distribuir aleatoriamente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ModuleGroupsTab({
    moduleId,
    enrolledStudents,
    canManageStudents,
}: ModuleGroupsTabProps) {
    const [groups, setGroups] = useState<ModuleGroupWithMembers[]>([]);
    const [enrollmentMode, setEnrollmentMode] = useState<GroupsEnrollmentMode>("teacher_assigned");
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [activeStudent, setActiveStudent] = useState<StudentBasic | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getModuleGroups(moduleId),
            getModuleGroupsEnrollmentMode(moduleId),
        ]).then(([groupsRes, modeRes]) => {
            if (cancelled) return;
            if (groupsRes.groups) setGroups(groupsRes.groups);
            if (modeRes.mode) setEnrollmentMode(modeRes.mode);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [moduleId]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Alumnos sin grupo asignado
    const assignedStudentIds = new Set(
        groups.flatMap((g) => g.members.map((m) => m.student_id)),
    );
    const unassignedStudents = enrolledStudents.filter((s) => !assignedStudentIds.has(s.id));

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const student = enrolledStudents.find((s) => s.id === event.active.id);
        setActiveStudent(student ?? null);
    }, [enrolledStudents]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveStudent(null);
        const { active, over } = event;
        if (!over) return;

        const studentId = active.id as string;
        const targetGroupId = over.id as string;
        const targetGroup = groups.find((g) => g.id === targetGroupId);
        if (!targetGroup) return;

        // Optimistic update
        const student = enrolledStudents.find((s) => s.id === studentId);
        if (!student) return;

        setGroups((prev) => prev.map((g) => {
            // Quitar del grupo anterior
            const filtered = { ...g, members: g.members.filter((m) => m.student_id !== studentId) };
            // Añadir al grupo destino
            if (g.id === targetGroupId) {
                return {
                    ...filtered,
                    members: [
                        ...filtered.members,
                        {
                            id: `temp-${studentId}`,
                            group_id: targetGroupId,
                            student_id: studentId,
                            joined_at: new Date().toISOString(),
                            profile: { id: studentId, full_name: student.full_name, avatar_url: student.avatar_url },
                        },
                    ],
                };
            }
            return filtered;
        }));

        startTransition(async () => {
            const result = await addStudentToGroup(moduleId, targetGroupId, studentId);
            if (result.error) {
                toast.error(result.error);
                // Recargar desde servidor
                getModuleGroups(moduleId).then((res) => { if (res.groups) setGroups(res.groups); });
            }
        });
    }, [groups, enrolledStudents, moduleId, initialGroups]);

    const handleCreateGroup = (name: string, color: string, maxMembers?: number) => {
        startTransition(async () => {
            const result = await createGroup(moduleId, name, color, maxMembers);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Grupo "${name}" creado.`);
                // La revalidación del servidor actualizará initialGroups en la próxima carga
            }
        });
    };

    const handleAutoAssign = (count: number) => {
        startTransition(async () => {
            const result = await autoAssignGroups(moduleId, count);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`${result.assigned} alumnos asignados automáticamente.`);
            }
        });
    };

    const handleRenameGroup = (groupId: string, name: string) => {
        setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name } : g));
        startTransition(async () => {
            const result = await updateGroup(moduleId, groupId, { name });
            if (result.error) toast.error(result.error);
        });
    };

    const handleDeleteGroup = (groupId: string) => {
        startTransition(async () => {
            const result = await deleteGroup(moduleId, groupId);
            if (result.error) {
                toast.error(result.error);
            } else {
                setGroups((prev) => prev.filter((g) => g.id !== groupId));
                toast.success("Grupo eliminado.");
            }
        });
        setDeleteTarget(null);
    };

    const handleRemoveMember = (groupId: string, studentId: string) => {
        setGroups((prev) => prev.map((g) =>
            g.id === groupId
                ? { ...g, members: g.members.filter((m) => m.student_id !== studentId) }
                : g
        ));
        startTransition(async () => {
            const result = await removeStudentFromGroup(moduleId, groupId, studentId);
            if (result.error) toast.error(result.error);
        });
    };

    const handleEnrollmentModeChange = (mode: GroupsEnrollmentMode) => {
        setEnrollmentMode(mode);
        startTransition(async () => {
            const result = await setModuleGroupsMode(moduleId, mode);
            if (result.error) toast.error(result.error);
        });
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-3 h-8">
                    <div className="h-5 w-20 rounded bg-surface" />
                    <div className="h-5 w-8 rounded bg-surface" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border border-border-subtle bg-surface h-48" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Barra de herramientas */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Grupos</h2>
                    <Badge variant="outline" className="border-border-subtle text-text-muted text-[10px] font-mono font-bold">
                        {groups.length}
                    </Badge>
                    {groups.length > 0 && (
                        <Badge variant="outline" className="border-border-subtle text-text-muted text-[10px] font-mono">
                            {unassignedStudents.length} sin asignar
                        </Badge>
                    )}
                </div>
                {canManageStudents && (
                    <div className="flex items-center gap-2">
                        <Select value={enrollmentMode} onValueChange={(v) => handleEnrollmentModeChange(v as GroupsEnrollmentMode)}>
                            <SelectTrigger className="h-8 text-xs bg-surface border-border-subtle w-auto gap-1.5">
                                <Settings2 className="size-3.5 text-text-muted" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border-subtle">
                                <SelectItem value="teacher_assigned">
                                    <span className="text-xs">Asignación por profesor</span>
                                </SelectItem>
                                <SelectItem value="self_enrollment">
                                    <span className="text-xs">Inscripción libre</span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoOpen(true)}
                            disabled={isPending || enrolledStudents.length === 0}
                            className="h-8 text-xs bg-surface border-border-subtle"
                        >
                            <Shuffle className="mr-1.5 size-3.5" /> Auto-asignar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            disabled={isPending}
                            className="h-8 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-mono font-bold tracking-widest uppercase"
                        >
                            <Plus className="mr-1.5 size-3.5" /> Grupo
                        </Button>
                    </div>
                )}
            </div>

            {/* Estado vacío */}
            {groups.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border-subtle p-12 flex flex-col items-center gap-4 text-center">
                    <div className="size-12 rounded-full bg-surface border border-border-subtle flex items-center justify-center">
                        <UsersRound className="size-6 text-text-muted" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-foreground">No hay grupos creados</h3>
                        <p className="text-xs text-text-muted max-w-sm">
                            Crea grupos manualmente o usa la auto-asignación para distribuir a los alumnos aleatoriamente.
                        </p>
                    </div>
                    {canManageStudents && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAutoOpen(true)} className="bg-surface border-border-subtle text-xs">
                                <Shuffle className="mr-1.5 size-3.5" /> Auto-asignar
                            </Button>
                            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-accent-blue hover:bg-accent-blue/90 text-white text-xs">
                                <Plus className="mr-1.5 size-3.5" /> Crear grupo
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                        {/* Panel izquierdo: alumnos sin asignar */}
                        <div className="rounded-xl border border-border-subtle bg-surface-dark p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
                                    Sin asignar
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono border-border-subtle text-text-muted">
                                    {unassignedStudents.length}
                                </Badge>
                            </div>
                            {unassignedStudents.length === 0 ? (
                                <p className="text-xs text-text-muted text-center py-4">
                                    Todos los alumnos están asignados
                                </p>
                            ) : (
                                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                                    {unassignedStudents.map((student) => (
                                        <DraggableStudent key={student.id} student={student} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Panel derecho: grupos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                            {groups.map((group) => (
                                <DroppableGroup
                                    key={group.id}
                                    group={group}
                                    enrolledStudents={enrolledStudents}
                                    canManage={canManageStudents}
                                    onRename={handleRenameGroup}
                                    onDelete={(id) => setDeleteTarget(id)}
                                    onRemoveMember={handleRemoveMember}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Overlay para el elemento arrastrado */}
                    <DragOverlay>
                        {activeStudent && (
                            <DraggableStudent student={activeStudent} isDragOverlay />
                        )}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Diálogos */}
            <CreateGroupDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onConfirm={handleCreateGroup}
                enrollmentMode={enrollmentMode}
            />
            <AutoAssignDialog
                open={autoOpen}
                onOpenChange={setAutoOpen}
                onConfirm={handleAutoAssign}
                totalStudents={unassignedStudents.length > 0 ? unassignedStudents.length : enrolledStudents.length}
            />
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <AlertDialogContent className="bg-surface border-border-subtle">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminarán también las asignaciones de los miembros. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => deleteTarget && handleDeleteGroup(deleteTarget)}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
