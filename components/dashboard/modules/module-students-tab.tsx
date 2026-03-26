"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Search, GraduationCap, Plus, MoreVertical, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Lock } from "lucide-react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { unenrollStudent } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
import { EnrollStudentDialog } from "@/components/dashboard/shared/enroll-student-dialog";
import { cn } from "@/lib/utils";
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
import { usePresence } from "@/components/dashboard/shared/presence-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Student {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    module_xp?: number;
    total_steps?: number;
    completed_steps?: number;
    last_activity?: string | null;
}

interface ModuleStudentsTabProps {
    moduleId: string;
    initialStudents: Student[];
    canManageStudents: boolean;
    restrictionMessage: string | null;
}

function formatLastActivity(dateStr: string | null | undefined) {
    if (!dateStr) return "Sin actividad";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function ModuleStudentsTab({
    moduleId,
    initialStudents,
    canManageStudents,
    restrictionMessage,
}: ModuleStudentsTabProps) {
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>(initialStudents);
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isPending, startTransition] = useTransition();
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const { onlineUsers } = usePresence();

    useEffect(() => {
        setEnrolledStudents(initialStudents);
    }, [initialStudents]);

    function handleUnenroll(studentId: string) {
        startTransition(async () => {
            const result = await unenrollStudent(moduleId, studentId);
            if (result.error) {
                toast.error("Error al desvincular alumno");
            } else {
                toast.success("Alumno desvinculado correctamente");
                setEnrolledStudents((prev) => prev.filter((s) => s.id !== studentId));
                setStudentToDelete(null);
            }
        });
    }

    const columns = useMemo<ColumnDef<Student>[]>(() => [
        {
            accessorKey: "full_name",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Alumno
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const s = row.original;
                const active = onlineUsers.has(s.id);
                return (
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="size-9 rounded-full overflow-hidden bg-accent-orange/10 flex items-center justify-center border border-accent-orange/20">
                                {s.avatar_url ? (
                                    <img src={s.avatar_url} alt={s.full_name || "Avatar"} className="size-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <span className="text-sm font-bold text-accent-orange">{s.full_name?.charAt(0) || "U"}</span>
                                )}
                            </div>
                            {active && (
                                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-accent-green border-2 border-surface-dark" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm truncate">{s.full_name || "Usuario Desconocido"}</div>
                            <div className="text-xs text-text-muted truncate">{s.email}</div>
                        </div>
                    </div>
                );
            },
            filterFn: (row, _id, filterValue: string) => {
                const s = row.original;
                const q = filterValue.toLowerCase();
                return !!(s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
            },
        },
        {
            accessorKey: "completed_steps",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Progreso
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                    )}
                </button>
            ),
            sortingFn: (a, b) => {
                const pctA = (a.original.total_steps ?? 0) > 0
                    ? (a.original.completed_steps ?? 0) / a.original.total_steps!
                    : 0;
                const pctB = (b.original.total_steps ?? 0) > 0
                    ? (b.original.completed_steps ?? 0) / b.original.total_steps!
                    : 0;
                return pctA - pctB;
            },
            cell: ({ row }) => {
                const total = row.original.total_steps ?? 0;
                const completed = row.original.completed_steps ?? 0;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                    <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue flex-1" />
                            <span className="text-xs font-bold text-foreground min-w-[30px] text-right">{progress}%</span>
                        </div>
                        <span className="text-[9px] text-text-muted font-mono uppercase tracking-tighter">
                            {completed} / {total} Pasos
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "last_activity",
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Última actividad
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                    )}
                </button>
            ),
            sortingFn: (a, b) => {
                const aMs = a.original.last_activity ? new Date(a.original.last_activity).getTime() : 0;
                const bMs = b.original.last_activity ? new Date(b.original.last_activity).getTime() : 0;
                return aMs - bMs;
            },
            cell: ({ row }) => (
                <span className="text-sm text-text-muted font-medium">
                    {formatLastActivity(row.original.last_activity)}
                </span>
            ),
        },
        {
            id: "status",
            accessorFn: (row) => onlineUsers.has(row.id) ? 1 : 0,
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Estado
                    {column.getIsSorted() === "asc" ? (
                        <ArrowUp className="size-3" />
                    ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className="size-3" />
                    ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const active = onlineUsers.has(row.original.id);
                return (
                    <div className={cn(
                        "inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
                        active
                            ? "bg-accent-green/10 border-accent-green/30 text-accent-green"
                            : "bg-surface border-border-strong text-text-muted"
                    )}>
                        <span className={cn("size-1.5 rounded-full", active ? "bg-accent-green animate-pulse" : "bg-text-muted")} />
                        {active ? "Online" : "Desconectado"}
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            id: "actions",
            header: () => <span className="w-8" />,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button
                             data-testid="student-actions-button"
                             variant="ghost"
                             size="icon"
                             className="size-8 text-text-muted hover:text-foreground data-[state=open]:bg-surface/50"
                             disabled={isPending || !canManageStudents}
                         >
                             <MoreVertical className="size-4" />
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px] bg-surface-dark border-border-strong">
                        <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            onClick={() => setStudentToDelete(row.original)}
                            disabled={isPending}
                        >
                            <Trash2 className="mr-2 size-4" />
                            Desvincular Alumno
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            enableSorting: false,
        },
    ], [onlineUsers, isPending]);

    const table = useReactTable({
        data: enrolledStudents,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: (row, _columnId, filterValue) => {
            const s = row.original;
            const q = (filterValue as string).toLowerCase();
            return !!(s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
        },
    });

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {!canManageStudents && restrictionMessage && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90">
                        {restrictionMessage}
                    </div>
                )}
                <div className="flex items-center justify-between gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                        <Input
                            placeholder="Buscar alumnos..."
                            className="pl-9 bg-surface border-border-subtle focus-visible:ring-accent-blue"
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    {canManageStudents ? (
                        <EnrollStudentDialog moduleId={moduleId}>
                            <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4">
                                <Plus className="mr-2 size-4" />
                                MATRICULAR ALUMNO
                            </Button>
                        </EnrollStudentDialog>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <Button disabled className="font-mono font-bold tracking-widest text-[10px] h-9 px-4">
                                            <Lock className="mr-2 size-4" />
                                            MATRICULAR ALUMNO
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>{restrictionMessage}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>

            <div className="bg-surface-dark border border-border-strong rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id} className="border-b border-border-strong bg-surface/30 hover:bg-surface/30">
                                {hg.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn("px-4 py-3", header.id === "actions" ? "w-12 text-right" : "")}
                                    >
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="divide-y divide-border-subtle">
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="p-12 text-center">
                                    <GraduationCap className="size-12 text-border-strong mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-foreground mb-1">No hay alumnos</h3>
                                    <p className="text-text-muted text-sm">
                                        {globalFilter
                                            ? "No se encontraron alumnos que coincidan con tu búsqueda."
                                            : "Aún no hay alumnos matriculados en este módulo."}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="odd:bg-white/2 even:bg-transparent hover:bg-blue-500/10 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn("px-4 py-4", cell.column.id === "actions" ? "text-right" : "")}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                <AlertDialogContent className="bg-surface border-border-strong">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desvincular alumno?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            Esta acción eliminará a <span className="text-foreground font-bold">{studentToDelete?.full_name}</span> del módulo.
                            Se conservarán sus entregas pero ya no podrá acceder a los contenidos de este módulo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-border-strong hover:bg-surface-dark">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => studentToDelete && handleUnenroll(studentToDelete.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Desvincular
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
