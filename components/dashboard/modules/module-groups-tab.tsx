"use client";

import { useEffect, useState, useTransition } from "react";
import {
    Check,
    Crown,
    EllipsisVertical,
    GripVertical,
    Hash,
    Lock,
    NotebookText,
    Palette,
    Pencil,
    Plus,
    Shuffle,
    Trash2,
    UserMinus,
    UsersRound,
    X,
} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    addStudentToGroup,
    assignGroupRepresentative,
    autoAssignGroups,
    createGroup,
    createModuleGroupRole,
    deleteGroup,
    deleteModuleGroupRole,
    generateEmptyGroups,
    getModuleGroupRoleSettings,
    getModuleGroups,
    getModuleGroupsEnrollmentMode,
    getTeacherGroupWorkLogs,
    removeStudentFromGroup,
    setModuleGroupRoleMode,
    setModuleGroupsMode,
    updateGroup,
} from "@/app/dashboard/modules/[id]/groups-actions";
import type {
    GroupRoleMode,
    GroupsEnrollmentMode,
    ModuleGroupMemberWithProfile,
    ModuleGroupRole,
    ModuleGroupWithMembers,
    ModuleGroupWorkLog,
} from "@/types/groups";

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

interface TeacherWorkLogItem extends ModuleGroupWorkLog {
    group: {
        id: string;
        name: string;
        color: string | null;
    } | null;
}

const GROUP_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
];

const ROLE_MODE_LABELS: Record<GroupRoleMode, string> = {
    free_text: "Rol libre",
    predefined: "Roles predefinidos",
};

const ENROLLMENT_MODE_LABELS: Record<GroupsEnrollmentMode, string> = {
    teacher_assigned: "Asignación por profesor",
    self_enrollment: "Inscripción libre",
    locked: "Grupos cerrados",
};

const EMPTY_REPRESENTATIVE = "__none__";

function getInitials(name: string | null): string {
    if (!name) return "?";
    return name.split(" ").map((chunk) => chunk[0]).join("").toUpperCase().slice(0, 2);
}

function getMemberRoleLabel(member: ModuleGroupMemberWithProfile): string | null {
    return member.predefined_role?.name ?? member.role_text;
}

function todayInMadrid(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function DraggableStudent({ student, isDragOverlay = false }: { student: StudentBasic; isDragOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id });

    return (
        <div
            ref={isDragOverlay ? undefined : setNodeRef}
            {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
            className={`flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 select-none transition-all
                ${isDragging ? "opacity-40 border-border-subtle" : "border-border-subtle hover:border-accent-blue/50 hover:bg-accent-blue/5"}
                ${isDragOverlay ? "cursor-grabbing border-accent-blue/50 bg-accent-blue/5 shadow-lg" : "cursor-grab active:cursor-grabbing"}
            `}
        >
            <GripVertical className="size-3.5 shrink-0 text-text-muted" />
            <Avatar className="size-6 shrink-0">
                <AvatarImage src={student.avatar_url ?? undefined} />
                <AvatarFallback className="bg-surface text-[9px] font-bold">
                    {getInitials(student.full_name)}
                </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{student.full_name ?? student.email ?? "Alumno"}</span>
        </div>
    );
}

function RoleSettingsCard({
    isPending,
    roleMode,
    roles,
    onCreateRole,
    onDeleteRole,
    onModeChange,
}: {
    isPending: boolean;
    roleMode: GroupRoleMode;
    roles: ModuleGroupRole[];
    onCreateRole: (name: string) => void;
    onDeleteRole: (roleId: string) => void;
    onModeChange: (mode: GroupRoleMode) => void;
}) {
    const [newRoleName, setNewRoleName] = useState("");

    function handleCreateRole() {
        const trimmed = newRoleName.trim();
        if (!trimmed) return;
        onCreateRole(trimmed);
        setNewRoleName("");
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Modo de roles</p>
                <p className="mt-1 text-sm text-text-muted">
                    El módulo solo usa un sistema activo: rol libre o catálogo de roles predefinidos.
                </p>
                <Select value={roleMode} onValueChange={(value) => onModeChange(value as GroupRoleMode)}>
                    <SelectTrigger className="mt-4 bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border-subtle">
                        <SelectItem value="free_text">Rol libre</SelectItem>
                        <SelectItem value="predefined">Roles predefinidos</SelectItem>
                    </SelectContent>
                </Select>
                <div className="mt-3 rounded-lg border border-border-subtle bg-background/60 px-3 py-2 text-xs text-text-muted">
                    Activo ahora: <span className="font-semibold text-foreground">{ROLE_MODE_LABELS[roleMode]}</span>
                </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Catálogo de roles</p>
                        <p className="mt-1 text-sm text-text-muted">
                            Si activas roles predefinidos, cada grupo necesita suficientes roles únicos para todos sus miembros.
                        </p>
                    </div>
                    <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                        {roles.length} roles
                    </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                    <Input
                        value={newRoleName}
                        onChange={(event) => setNewRoleName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") handleCreateRole();
                        }}
                        placeholder="Ej: coordinador, redactor, portavoz"
                        className="bg-background"
                    />
                    <Button
                        onClick={handleCreateRole}
                        disabled={isPending || !newRoleName.trim()}
                        className="bg-accent-blue text-primary-foreground hover:bg-accent-blue/90"
                    >
                        <Plus className="mr-2 size-4" />
                        Rol
                    </Button>
                </div>
                {roles.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-border-subtle px-4 py-5 text-sm text-text-muted">
                        No has creado roles predefinidos todavía.
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background px-3 py-1.5 text-sm"
                            >
                                <span className="font-medium">{role.name}</span>
                                <button
                                    type="button"
                                    onClick={() => onDeleteRole(role.id)}
                                    className="text-text-muted transition-colors hover:text-red-400"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function WorkLogsPanel({
    logs,
    selectedDate,
    onDateChange,
}: {
    logs: TeacherWorkLogItem[];
    selectedDate: string;
    onDateChange: (value: string) => void;
}) {
    return (
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-border-subtle bg-background p-2">
                        <NotebookText className="size-4 text-text-muted" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Diario del grupo</p>
                        <p className="mt-1 text-sm text-text-muted">
                            Una entrada por alumno y día. Solo lectura para el profesorado desde esta vista.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">Fecha</label>
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => onDateChange(event.target.value)}
                        className="w-[170px] bg-background"
                    />
                </div>
            </div>

            {logs.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-border-subtle px-4 py-5 text-sm text-text-muted">
                    No hay entradas para la fecha seleccionada.
                </div>
            ) : (
                <div className="mt-4 grid gap-3">
                    {logs.map((log) => (
                        <div key={log.id} className="rounded-xl border border-border-subtle bg-background p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                    {log.group?.name ?? "Grupo"}
                                </Badge>
                                <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                    {log.entry_date}
                                </Badge>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <Avatar className="size-8 shrink-0">
                                    <AvatarImage src={log.profile?.avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-surface text-[10px] font-bold">
                                        {getInitials(log.profile?.full_name ?? null)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{log.profile?.full_name ?? "Alumno"}</p>
                                    <p className="text-xs text-text-muted">Actualizado: {new Date(log.updated_at).toLocaleString("es-ES")}</p>
                                </div>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{log.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DroppableGroup({
    canManage,
    group,
    onDelete,
    onRemoveMember,
    onRename,
    onRepresentativeChange,
    onUpdateColor,
    onUpdateMaxMembers,
}: {
    canManage: boolean;
    group: ModuleGroupWithMembers;
    onDelete: (groupId: string) => void;
    onRemoveMember: (groupId: string, studentId: string) => void;
    onRename: (groupId: string, name: string) => void;
    onRepresentativeChange: (groupId: string, studentId: string | null) => void;
    onUpdateColor: (groupId: string, color: string) => void;
    onUpdateMaxMembers: (groupId: string, maxMembers: number | null) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: group.id, disabled: !canManage });
    const [editingName, setEditingName] = useState(false);
    const [editingMax, setEditingMax] = useState(false);
    const [editingColor, setEditingColor] = useState(false);
    const [nameValue, setNameValue] = useState(group.name);
    const [maxValue, setMaxValue] = useState(group.max_members?.toString() ?? "");

    const memberOptions = [...group.members].sort((left, right) => {
        const leftName = left.profile?.full_name ?? "";
        const rightName = right.profile?.full_name ?? "";
        return leftName.localeCompare(rightName, "es");
    });

    function handleSaveName() {
        const trimmed = nameValue.trim();
        if (trimmed && trimmed !== group.name) {
            onRename(group.id, trimmed);
        }
        setEditingName(false);
    }

    function handleSaveMaxMembers() {
        const trimmed = maxValue.trim();
        const parsed = trimmed ? Number.parseInt(trimmed, 10) : null;
        if (parsed !== null && (!Number.isFinite(parsed) || parsed < 1)) {
            setMaxValue(group.max_members?.toString() ?? "");
            setEditingMax(false);
            return;
        }
        onUpdateMaxMembers(group.id, parsed);
        setEditingMax(false);
    }

    return (
        <div
            ref={setNodeRef}
            className={`rounded-xl border transition-all ${isOver ? "border-accent-blue bg-accent-blue/5 shadow-md" : "border-border-subtle bg-surface"}`}
        >
            <div className="border-b border-border-subtle px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: group.color ?? "#6b7280" }} />
                    {editingName ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <Input
                                value={nameValue}
                                onChange={(event) => setNameValue(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") handleSaveName();
                                    if (event.key === "Escape") {
                                        setEditingName(false);
                                        setNameValue(group.name);
                                    }
                                }}
                                className="h-7 bg-background text-sm"
                                autoFocus
                            />
                            <Button size="icon" variant="ghost" className="size-6" onClick={handleSaveName}>
                                <Check className="size-3 text-accent-green" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-6"
                                onClick={() => {
                                    setEditingName(false);
                                    setNameValue(group.name);
                                }}
                            >
                                <X className="size-3 text-red-400" />
                            </Button>
                        </div>
                    ) : (
                        <span className="flex-1 truncate text-sm font-semibold">{group.name}</span>
                    )}

                    {editingMax ? (
                        <div className="ml-auto flex items-center gap-1">
                            <Input
                                type="number"
                                min={1}
                                value={maxValue}
                                onChange={(event) => setMaxValue(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") handleSaveMaxMembers();
                                    if (event.key === "Escape") {
                                        setEditingMax(false);
                                        setMaxValue(group.max_members?.toString() ?? "");
                                    }
                                }}
                                placeholder="∞"
                                className="h-6 w-14 bg-background px-1 text-center text-xs"
                                autoFocus
                            />
                            <Button size="icon" variant="ghost" className="size-5" onClick={handleSaveMaxMembers}>
                                <Check className="size-3 text-accent-green" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-5"
                                onClick={() => {
                                    setEditingMax(false);
                                    setMaxValue(group.max_members?.toString() ?? "");
                                }}
                            >
                                <X className="size-3 text-red-400" />
                            </Button>
                        </div>
                    ) : (
                        <Badge variant="outline" className="ml-auto shrink-0 border-border-subtle text-[10px] font-mono text-text-muted">
                            {group.members.length}{group.max_members ? `/${group.max_members}` : ""}
                        </Badge>
                    )}

                    {canManage && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-6 shrink-0">
                                    <EllipsisVertical className="size-3.5 text-text-muted" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-border-subtle bg-surface">
                                <DropdownMenuItem onClick={() => setEditingName(true)}>
                                    <Pencil className="mr-2 size-3.5" />
                                    Renombrar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setMaxValue(group.max_members?.toString() ?? "");
                                        setEditingMax(true);
                                    }}
                                >
                                    <Hash className="mr-2 size-3.5" />
                                    Límite de miembros
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingColor(true)}>
                                    <Palette className="mr-2 size-3.5" />
                                    Cambiar color
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => onDelete(group.id)}>
                                    <Trash2 className="mr-2 size-3.5" />
                                    Eliminar grupo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {editingColor && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {GROUP_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => {
                                    onUpdateColor(group.id, color);
                                    setEditingColor(false);
                                }}
                                className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${group.color === color ? "border-foreground scale-110" : "border-transparent"}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <Button size="icon" variant="ghost" className="ml-auto size-5" onClick={() => setEditingColor(false)}>
                            <X className="size-3 text-text-muted" />
                        </Button>
                    </div>
                )}

                {canManage && (
                    <div className="mt-3 grid gap-2 rounded-lg border border-border-subtle bg-background/70 p-3">
                        <div className="flex items-center gap-2">
                            <Crown className="size-3.5 text-amber-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Representante</span>
                        </div>
                        <Select
                            value={group.representative_student_id ?? EMPTY_REPRESENTATIVE}
                            onValueChange={(value) => onRepresentativeChange(group.id, value === EMPTY_REPRESENTATIVE ? null : value)}
                        >
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Sin representante" />
                            </SelectTrigger>
                            <SelectContent className="border-border-subtle bg-surface">
                                <SelectItem value={EMPTY_REPRESENTATIVE}>Sin representante</SelectItem>
                                {memberOptions.map((member) => (
                                    <SelectItem key={member.student_id} value={member.student_id}>
                                        {member.profile?.full_name ?? "Alumno"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex min-h-[120px] flex-col gap-1.5 p-3">
                {group.members.length === 0 ? (
                    <div className={`flex min-h-[72px] flex-1 items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isOver ? "border-accent-blue/60 bg-accent-blue/5" : "border-border-subtle"}`}>
                        <p className="text-xs text-text-muted">{isOver ? "Soltar aquí" : "Arrastra alumnos aquí"}</p>
                    </div>
                ) : (
                    <>
                        {memberOptions.map((member) => {
                            const roleLabel = getMemberRoleLabel(member);
                            const isRepresentative = group.representative_student_id === member.student_id;
                            return (
                                <div
                                    key={member.student_id}
                                    className="group rounded-lg border border-border-subtle bg-background px-2.5 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Avatar className="size-5 shrink-0">
                                            <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                                            <AvatarFallback className="bg-surface text-[8px] font-bold">
                                                {getInitials(member.profile?.full_name ?? null)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="flex-1 truncate text-xs font-medium">
                                            {member.profile?.full_name ?? "Alumno"}
                                        </span>
                                        {isRepresentative && (
                                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                                                <Crown className="mr-1 size-2.5" />
                                                Rep.
                                            </Badge>
                                        )}
                                        {canManage && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
                                                onClick={() => onRemoveMember(group.id, member.student_id)}
                                            >
                                                <UserMinus className="size-3 text-red-400" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                            {roleLabel ?? "Sin rol"}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                        {isOver && (
                            <div className="flex h-9 items-center justify-center rounded-lg border-2 border-dashed border-accent-blue/60 bg-accent-blue/5">
                                <p className="text-xs text-accent-blue">Soltar aquí</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function CreateGroupDialog({
    enrollmentMode,
    onConfirm,
    onOpenChange,
    open,
}: {
    enrollmentMode: GroupsEnrollmentMode;
    onConfirm: (name: string, color: string, maxMembers?: number) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(GROUP_COLORS[0]);
    const [maxMembers, setMaxMembers] = useState("");

    function handleConfirm() {
        const trimmed = name.trim();
        if (!trimmed) return;
        onConfirm(trimmed, color, maxMembers ? Number.parseInt(maxMembers, 10) : undefined);
        setName("");
        setColor(GROUP_COLORS[0]);
        setMaxMembers("");
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-border-subtle bg-surface sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-widest">Nuevo grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">Nombre</label>
                        <Input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleConfirm();
                            }}
                            placeholder="Ej: Grupo Alpha"
                            className="bg-background"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {GROUP_COLORS.map((paletteColor) => (
                                <button
                                    key={paletteColor}
                                    type="button"
                                    onClick={() => setColor(paletteColor)}
                                    className={`size-7 rounded-full border-2 transition-transform ${paletteColor === color ? "border-foreground scale-110" : "border-transparent"}`}
                                    style={{ backgroundColor: paletteColor }}
                                />
                            ))}
                        </div>
                    </div>
                    {enrollmentMode === "self_enrollment" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                                Máximo de miembros <span className="normal-case font-normal">(opcional)</span>
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={maxMembers}
                                onChange={(event) => setMaxMembers(event.target.value)}
                                placeholder="Sin límite"
                                className="bg-background"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={!name.trim()} className="bg-accent-blue text-primary-foreground hover:bg-accent-blue/90">
                        Crear grupo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AutoAssignDialog({
    onConfirm,
    onOpenChange,
    open,
    totalStudents,
}: {
    onConfirm: (count: number) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    totalStudents: number;
}) {
    const [count, setCount] = useState("4");
    const numericCount = Number.parseInt(count, 10) || 0;
    const perGroup = numericCount > 0 ? Math.ceil(totalStudents / numericCount) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-border-subtle bg-surface sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-widest">Auto-asignación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">Número de grupos</label>
                        <Input
                            type="number"
                            min={2}
                            max={totalStudents}
                            value={count}
                            onChange={(event) => setCount(event.target.value)}
                            className="bg-background"
                            autoFocus
                        />
                    </div>
                    {numericCount > 0 && (
                        <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/10 px-4 py-3 text-sm text-accent-blue">
                            <span className="font-semibold">{totalStudents} alumnos</span> se distribuirán en{" "}
                            <span className="font-semibold">{numericCount} grupos</span> de aprox.{" "}
                            <span className="font-semibold">{perGroup}</span> miembros cada uno.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={() => {
                            onConfirm(numericCount);
                            onOpenChange(false);
                        }}
                        disabled={numericCount < 2}
                        className="bg-accent-blue text-primary-foreground hover:bg-accent-blue/90"
                    >
                        <Shuffle className="mr-2 size-4" />
                        Distribuir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GenerateGroupsDialog({
    existingGroupCount,
    onConfirm,
    onOpenChange,
    open,
}: {
    existingGroupCount: number;
    onConfirm: (count: number, maxMembers?: number) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const [count, setCount] = useState("4");
    const [maxMembers, setMaxMembers] = useState("");
    const numericCount = Number.parseInt(count, 10) || 0;
    const preview = numericCount > 0
        ? Array.from({ length: Math.min(numericCount, 5) }, (_, index) => `Grupo ${existingGroupCount + index + 1}`)
        : [];

    function handleConfirm() {
        if (numericCount < 1) return;
        onConfirm(numericCount, maxMembers ? Number.parseInt(maxMembers, 10) : undefined);
        setCount("4");
        setMaxMembers("");
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-border-subtle bg-surface sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-widest">Generar grupos vacíos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">Número de grupos</label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={count}
                            onChange={(event) => setCount(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleConfirm();
                            }}
                            className="bg-background"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                            Máximo de miembros <span className="normal-case font-normal">(opcional)</span>
                        </label>
                        <Input
                            type="number"
                            min={1}
                            value={maxMembers}
                            onChange={(event) => setMaxMembers(event.target.value)}
                            placeholder="Sin límite"
                            className="bg-background"
                        />
                    </div>
                    {numericCount > 0 && (
                        <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/10 px-4 py-3 text-sm text-accent-blue">
                            Se crearán <span className="font-semibold">{numericCount} grupos</span>:{" "}
                            <span className="font-medium">{preview.join(", ")}{numericCount > 5 ? "…" : ""}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={numericCount < 1} className="bg-accent-blue text-primary-foreground hover:bg-accent-blue/90">
                        <Plus className="mr-2 size-4" />
                        Generar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ModuleGroupsTab({
    moduleId,
    enrolledStudents,
    canManageStudents,
}: ModuleGroupsTabProps) {
    const [groups, setGroups] = useState<ModuleGroupWithMembers[]>([]);
    const [enrollmentMode, setEnrollmentMode] = useState<GroupsEnrollmentMode>("teacher_assigned");
    const [roleMode, setRoleMode] = useState<GroupRoleMode>("free_text");
    const [roles, setRoles] = useState<ModuleGroupRole[]>([]);
    const [teacherLogs, setTeacherLogs] = useState<TeacherWorkLogItem[]>([]);
    const [selectedLogDate, setSelectedLogDate] = useState(todayInMadrid());
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [autoOpen, setAutoOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [activeStudent, setActiveStudent] = useState<StudentBasic | null>(null);
    const [isPending, startTransition] = useTransition();

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    async function refreshGroups() {
        const response = await getModuleGroups(moduleId);
        if (response.groups) {
            setGroups(response.groups);
        }
    }

    async function refreshRoleSettings() {
        const response = await getModuleGroupRoleSettings(moduleId);
        if (response.settings) {
            setRoleMode(response.settings.mode);
            setRoles(response.settings.roles);
        }
    }

    async function refreshTeacherLogs(date: string) {
        const response = await getTeacherGroupWorkLogs(moduleId, date);
        if (response.logs) {
            setTeacherLogs(response.logs);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [groupsResponse, enrollmentResponse, roleResponse, logsResponse] = await Promise.all([
                getModuleGroups(moduleId),
                getModuleGroupsEnrollmentMode(moduleId),
                getModuleGroupRoleSettings(moduleId),
                getTeacherGroupWorkLogs(moduleId, selectedLogDate),
            ]);

            if (cancelled) return;

            if (groupsResponse.groups) setGroups(groupsResponse.groups);
            if (enrollmentResponse.mode) setEnrollmentMode(enrollmentResponse.mode);
            if (roleResponse.settings) {
                setRoleMode(roleResponse.settings.mode);
                setRoles(roleResponse.settings.roles);
            }
            if (logsResponse.logs) setTeacherLogs(logsResponse.logs);
            setLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [moduleId, selectedLogDate]);

    const assignedStudentIds = new Set(groups.flatMap((group) => group.members.map((member) => member.student_id)));
    const unassignedStudents = enrolledStudents.filter((student) => !assignedStudentIds.has(student.id));
    const isReadOnly = !canManageStudents;

    function handleDragStart(event: DragStartEvent) {
        const student = enrolledStudents.find((candidate) => candidate.id === event.active.id);
        setActiveStudent(student ?? null);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveStudent(null);
        const { active, over } = event;
        if (!over) return;

        const studentId = active.id as string;
        const targetGroupId = over.id as string;
        const student = enrolledStudents.find((candidate) => candidate.id === studentId);
        if (!student) return;

        setGroups((previous) => previous.map((group) => {
            const filteredMembers = group.members.filter((member) => member.student_id !== studentId);
            if (group.id !== targetGroupId) {
                return { ...group, members: filteredMembers };
            }

            return {
                ...group,
                members: [
                    ...filteredMembers,
                    {
                        id: `temp-${studentId}`,
                        group_id: targetGroupId,
                        student_id: studentId,
                        joined_at: new Date().toISOString(),
                        role_text: null,
                        predefined_role_id: null,
                        profile: {
                            id: studentId,
                            full_name: student.full_name,
                            avatar_url: student.avatar_url,
                        },
                        predefined_role: null,
                    },
                ],
            };
        }));

        startTransition(async () => {
            const result = await addStudentToGroup(moduleId, targetGroupId, studentId);
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
                return;
            }
            await refreshGroups();
        });
    }

    function handleCreateGroup(name: string, color: string, maxMembers?: number) {
        startTransition(async () => {
            const result = await createGroup(moduleId, name, color, maxMembers);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success(`Grupo "${name}" creado.`);
            await refreshGroups();
        });
    }

    function handleAutoAssign(count: number) {
        startTransition(async () => {
            const result = await autoAssignGroups(moduleId, count);
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
                return;
            }
            toast.success(`${result.assigned ?? 0} alumnos asignados automáticamente.`);
            await refreshGroups();
        });
    }

    function handleGenerateGroups(count: number, maxMembers?: number) {
        startTransition(async () => {
            const result = await generateEmptyGroups(moduleId, count, maxMembers);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success(`${count} grupos vacíos creados.`);
            await refreshGroups();
        });
    }

    function handleUpdateMaxMembers(groupId: string, maxMembers: number | null) {
        setGroups((previous) => previous.map((group) => (
            group.id === groupId ? { ...group, max_members: maxMembers } : group
        )));
        startTransition(async () => {
            const result = await updateGroup(moduleId, groupId, { max_members: maxMembers });
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
            }
        });
    }

    function handleUpdateColor(groupId: string, color: string) {
        setGroups((previous) => previous.map((group) => (
            group.id === groupId ? { ...group, color } : group
        )));
        startTransition(async () => {
            const result = await updateGroup(moduleId, groupId, { color });
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
            }
        });
    }

    function handleRenameGroup(groupId: string, name: string) {
        setGroups((previous) => previous.map((group) => (
            group.id === groupId ? { ...group, name } : group
        )));
        startTransition(async () => {
            const result = await updateGroup(moduleId, groupId, { name });
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
            }
        });
    }

    function handleDeleteGroup(groupId: string) {
        startTransition(async () => {
            const result = await deleteGroup(moduleId, groupId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setGroups((previous) => previous.filter((group) => group.id !== groupId));
            toast.success("Grupo eliminado.");
        });
        setDeleteTarget(null);
    }

    function handleRemoveMember(groupId: string, studentId: string) {
        setGroups((previous) => previous.map((group) => (
            group.id === groupId
                ? { ...group, members: group.members.filter((member) => member.student_id !== studentId) }
                : group
        )));
        startTransition(async () => {
            const result = await removeStudentFromGroup(moduleId, groupId, studentId);
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
            }
        });
    }

    function handleEnrollmentModeChange(mode: GroupsEnrollmentMode) {
        setEnrollmentMode(mode);
        startTransition(async () => {
            const result = await setModuleGroupsMode(moduleId, mode);
            if (result.error) {
                toast.error(result.error);
                const fresh = await getModuleGroupsEnrollmentMode(moduleId);
                if (fresh.mode) setEnrollmentMode(fresh.mode);
                return;
            }
            toast.success(`Modo cambiado a "${ENROLLMENT_MODE_LABELS[mode]}".`);
        });
    }

    function handleRoleModeChange(mode: GroupRoleMode) {
        setRoleMode(mode);
        startTransition(async () => {
            const result = await setModuleGroupRoleMode(moduleId, mode);
            if (result.error) {
                toast.error(result.error);
                await refreshRoleSettings();
                return;
            }
            toast.success(`Modo de roles cambiado a "${ROLE_MODE_LABELS[mode]}".`);
            await refreshRoleSettings();
        });
    }

    function handleCreateRole(name: string) {
        startTransition(async () => {
            const result = await createModuleGroupRole(moduleId, name);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success(`Rol "${name}" creado.`);
            await refreshRoleSettings();
        });
    }

    function handleDeleteRole(roleId: string) {
        startTransition(async () => {
            const result = await deleteModuleGroupRole(moduleId, roleId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Rol eliminado.");
            await refreshRoleSettings();
            await refreshGroups();
        });
    }

    function handleRepresentativeChange(groupId: string, studentId: string | null) {
        startTransition(async () => {
            const result = await assignGroupRepresentative(moduleId, groupId, studentId);
            if (result.error) {
                toast.error(result.error);
                await refreshGroups();
                return;
            }
            toast.success(studentId ? "Representante actualizado." : "Representante eliminado.");
            await refreshGroups();
        });
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-24 rounded-xl border border-border-subtle bg-surface" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-48 rounded-xl border border-border-subtle bg-surface" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Grupos</h2>
                    <Badge variant="outline" className="border-border-subtle text-[10px] font-mono font-bold text-text-muted">
                        {groups.length}
                    </Badge>
                    {canManageStudents && groups.length > 0 && (
                        <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                            {unassignedStudents.length} sin asignar
                        </Badge>
                    )}
                </div>
                {canManageStudents && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={enrollmentMode} onValueChange={(value) => handleEnrollmentModeChange(value as GroupsEnrollmentMode)}>
                            <SelectTrigger className="h-9 w-auto gap-1.5 bg-accent-blue px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-accent-blue/90">
                                <Lock className="size-3.5 text-primary-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border-subtle bg-surface">
                                <SelectItem value="teacher_assigned">Asignación por profesor</SelectItem>
                                <SelectItem value="self_enrollment">Inscripción libre</SelectItem>
                                <SelectItem value="locked">Grupos cerrados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGenerateOpen(true)}
                            disabled={isPending}
                            className="h-9 bg-accent-blue px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-accent-blue/90"
                        >
                            <Plus className="mr-2 size-4" />
                            Generar grupos
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoOpen(true)}
                            disabled={isPending || enrolledStudents.length === 0}
                            className="h-9 bg-accent-blue px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-accent-blue/90"
                        >
                            <Shuffle className="mr-2 size-4" />
                            Auto-asignar
                        </Button>
                        <Button
                            onClick={() => setCreateOpen(true)}
                            disabled={isPending}
                            className="h-9 bg-accent-blue px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-accent-blue/90"
                        >
                            <Plus className="mr-2 size-4" />
                            Grupo
                        </Button>
                    </div>
                )}
            </div>

            {canManageStudents && (
                <RoleSettingsCard
                    isPending={isPending}
                    roleMode={roleMode}
                    roles={roles}
                    onCreateRole={handleCreateRole}
                    onDeleteRole={handleDeleteRole}
                    onModeChange={handleRoleModeChange}
                />
            )}

            {groups.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border-subtle p-12 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full border border-border-subtle bg-surface">
                        <UsersRound className="size-6 text-text-muted" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-foreground">No hay grupos creados</h3>
                        <p className="max-w-sm text-xs text-text-muted">
                            {canManageStudents
                                ? "Crea grupos manualmente o usa la auto-asignación para distribuir a los alumnos."
                                : "El profesor aún no ha creado grupos para este módulo."}
                        </p>
                    </div>
                </div>
            ) : isReadOnly ? (
                <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {groups.map((group) => (
                        <DroppableGroup
                            key={group.id}
                            canManage={false}
                            group={group}
                            onDelete={(groupId) => setDeleteTarget(groupId)}
                            onRemoveMember={handleRemoveMember}
                            onRename={handleRenameGroup}
                            onRepresentativeChange={handleRepresentativeChange}
                            onUpdateColor={handleUpdateColor}
                            onUpdateMaxMembers={handleUpdateMaxMembers}
                        />
                    ))}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-dark p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Sin asignar</span>
                                <Badge variant="outline" className="border-border-subtle text-[10px] font-mono text-text-muted">
                                    {unassignedStudents.length}
                                </Badge>
                            </div>
                            {unassignedStudents.length === 0 ? (
                                <p className="py-4 text-center text-xs text-text-muted">Todos los alumnos están asignados</p>
                            ) : (
                                <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
                                    {unassignedStudents.map((student) => (
                                        <DraggableStudent key={student.id} student={student} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {groups.map((group) => (
                                <DroppableGroup
                                    key={group.id}
                                    canManage={canManageStudents}
                                    group={group}
                                    onDelete={(groupId) => setDeleteTarget(groupId)}
                                    onRemoveMember={handleRemoveMember}
                                    onRename={handleRenameGroup}
                                    onRepresentativeChange={handleRepresentativeChange}
                                    onUpdateColor={handleUpdateColor}
                                    onUpdateMaxMembers={handleUpdateMaxMembers}
                                />
                            ))}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeStudent ? <DraggableStudent student={activeStudent} isDragOverlay /> : null}
                    </DragOverlay>
                </DndContext>
            )}

            {canManageStudents && (
                <WorkLogsPanel logs={teacherLogs} selectedDate={selectedLogDate} onDateChange={setSelectedLogDate} />
            )}

            <CreateGroupDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onConfirm={handleCreateGroup}
                enrollmentMode={enrollmentMode}
            />
            <GenerateGroupsDialog
                open={generateOpen}
                onOpenChange={setGenerateOpen}
                onConfirm={handleGenerateGroups}
                existingGroupCount={groups.length}
            />
            <AutoAssignDialog
                open={autoOpen}
                onOpenChange={setAutoOpen}
                onConfirm={handleAutoAssign}
                totalStudents={unassignedStudents.length > 0 ? unassignedStudents.length : enrolledStudents.length}
            />
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="border-border-subtle bg-surface">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminarán también las asignaciones de miembros, representante y diarios. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 text-white hover:bg-red-600"
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
