"use client";

import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { RubricCriteria, RubricLevel } from "@/types/activity";
import {
    Plus,
    Trash2,
    Library,
    CloudUpload,
    RefreshCw,
    Layers,
    X,
    Sparkles,
    Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";

interface RubricBuilderModalProps {
    rubric: RubricCriteria[];
    open: boolean;
    onClose: () => void;
    onChange: (rubric: RubricCriteria[]) => void;
}

type RubricVisibility = "private" | "public";

type RubricCriterionLibraryItem = {
    id: string;
    name: string;
    description: string | null;
    levels: RubricLevel[];
    visibility: RubricVisibility;
    version: number;
    created_by: string;
    updated_at: string;
    is_owner: boolean;
};

type RubricLibraryItem = {
    id: string;
    name: string;
    description: string | null;
    criteria: RubricCriteria[];
    visibility: RubricVisibility;
    version: number;
    created_by: string;
    updated_at: string;
    is_owner: boolean;
};

type OverlayMode = "criterion-library" | "criterion-save" | "rubric-save" | null;

const DEFAULT_LEVELS: Omit<RubricLevel, "id">[] = [
    { label: "Insuficiente", points: 0, description: "" },
    { label: "En progreso", points: 1, description: "" },
    { label: "Competente", points: 2, description: "" },
    { label: "Excelente", points: 3, description: "" },
];

function buildBlankCriterion(): RubricCriteria {
    return {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        levels: DEFAULT_LEVELS.map((level) => ({ ...level, id: crypto.randomUUID() })),
    };
}

function cloneLevels(levels: RubricLevel[]) {
    return levels.map((level) => ({
        id: crypto.randomUUID(),
        label: level.label,
        points: level.points,
        description: level.description ?? "",
    }));
}

function buildCriterionSnapshot(
    criterion: Pick<RubricCriteria, "name" | "description" | "levels" | "source_criterion_id" | "source_version" | "source_visibility">,
    rubricSource?: { id: string; version: number; visibility: RubricVisibility }
): RubricCriteria {
    return {
        id: crypto.randomUUID(),
        name: criterion.name,
        description: criterion.description ?? "",
        levels: cloneLevels(criterion.levels ?? []),
        source_criterion_id: criterion.source_criterion_id,
        source_version: criterion.source_version,
        source_visibility: criterion.source_visibility,
        source_rubric_id: rubricSource?.id,
        source_rubric_version: rubricSource?.version,
        source_rubric_visibility: rubricSource?.visibility,
    };
}

function buildSnapshotCriterion(criterion: RubricCriterionLibraryItem): RubricCriteria {
    return buildCriterionSnapshot({
        name: criterion.name,
        description: criterion.description ?? "",
        levels: criterion.levels,
        source_criterion_id: criterion.id,
        source_version: criterion.version,
        source_visibility: criterion.visibility,
    });
}

function buildSnapshotRubric(rubric: RubricLibraryItem): RubricCriteria[] {
    return rubric.criteria.map((criterion) =>
        buildCriterionSnapshot(
            {
                name: criterion.name,
                description: criterion.description ?? "",
                levels: criterion.levels ?? [],
                source_criterion_id: criterion.source_criterion_id,
                source_version: criterion.source_version,
                source_visibility: criterion.source_visibility,
            },
            {
                id: rubric.id,
                version: rubric.version,
                visibility: rubric.visibility,
            }
        )
    );
}

function deriveRubricSource(rubric: RubricCriteria[]) {
    const rubricIds = Array.from(new Set(rubric.map((criterion) => criterion.source_rubric_id).filter(Boolean)));
    if (rubricIds.length !== 1) return null;

    const rubricId = rubricIds[0] as string;
    const linkedCriteria = rubric.filter((criterion) => criterion.source_rubric_id === rubricId);
    if (linkedCriteria.length !== rubric.length) return null;

    const versions = Array.from(new Set(linkedCriteria.map((criterion) => criterion.source_rubric_version).filter((value) => value !== undefined)));
    if (versions.length !== 1) return null;

    const visibilities = Array.from(new Set(linkedCriteria.map((criterion) => criterion.source_rubric_visibility).filter(Boolean)));
    if (visibilities.length !== 1) return null;

    return {
        id: rubricId,
        version: versions[0] as number,
        visibility: visibilities[0] as RubricVisibility,
    };
}

function getRubricValidationError(rubric: RubricCriteria[]) {
    if (!rubric.length) return "Añade al menos un criterio antes de guardar la rúbrica.";

    for (const criterion of rubric) {
        if (!criterion.name.trim()) return "Todos los criterios deben tener nombre antes de guardarse.";
        if (!criterion.levels?.length) return `El criterio "${criterion.name}" debe tener al menos un nivel.`;
        for (const level of criterion.levels) {
            if (!level.label.trim()) return `Todos los niveles del criterio "${criterion.name}" deben tener etiqueta.`;
        }
    }

    return null;
}

function buildRubricDraftName(rubric: RubricCriteria[]) {
    if (rubric.length === 1 && rubric[0]?.name.trim()) return rubric[0].name.trim();
    return `Rúbrica (${rubric.length} criterios)`;
}

function formatUpdatedAt(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function libraryCardClass(isActive: boolean) {
    return cn(
        "w-full rounded-xl border p-4 text-left transition-all duration-200",
        isActive
            ? "border-accent-blue/40 bg-accent-blue/8 shadow-[0_12px_30px_-22px_rgba(0,112,243,0.65)]"
            : "border-border/50 bg-surface-dark/40 hover:border-border-strong hover:bg-surface-dark/70"
    );
}

function getSavedActionClass(isSaved: boolean) {
    return isSaved
        ? "border-emerald-600/35 bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        : "border-accent-blue/30 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/16";
}

function normalizeRubricLevels(levels: RubricLevel[]) {
    return levels.map((level) => ({
        id: level.id,
        label: level.label,
        points: level.points,
        description: level.description ?? "",
    }));
}

function normalizeRubricCriteria(criteria: RubricCriteria[]) {
    return criteria.map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description ?? "",
        levels: normalizeRubricLevels(criterion.levels ?? []),
        source_criterion_id: criterion.source_criterion_id ?? null,
        source_version: criterion.source_version ?? null,
        source_visibility: criterion.source_visibility ?? null,
        source_rubric_id: criterion.source_rubric_id ?? null,
        source_rubric_version: criterion.source_rubric_version ?? null,
        source_rubric_visibility: criterion.source_rubric_visibility ?? null,
    }));
}

function hydrateRubricCriteria(criteria: RubricCriteria[]) {
    return criteria.map((criterion) => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description ?? "",
        levels: normalizeRubricLevels(criterion.levels ?? []),
        source_criterion_id: criterion.source_criterion_id ?? undefined,
        source_version: criterion.source_version ?? undefined,
        source_visibility: criterion.source_visibility ?? undefined,
        source_rubric_id: criterion.source_rubric_id ?? undefined,
        source_rubric_version: criterion.source_rubric_version ?? undefined,
        source_rubric_visibility: criterion.source_rubric_visibility ?? undefined,
    }));
}

export function RubricBuilderModal({ rubric, open, onClose, onChange }: RubricBuilderModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(() => rubric[0]?.id ?? null);
    const [libraryCriteria, setLibraryCriteria] = useState<RubricCriterionLibraryItem[]>([]);
    const [libraryRubrics, setLibraryRubrics] = useState<RubricLibraryItem[]>([]);
    const [overlayMode, setOverlayMode] = useState<OverlayMode>(null);
    const [saveCriterionVisibility, setSaveCriterionVisibility] = useState<RubricVisibility>("private");
    const [saveRubricVisibility, setSaveRubricVisibility] = useState<RubricVisibility>("private");
    const [rubricSaveName, setRubricSaveName] = useState("");
    const [rubricSaveDescription, setRubricSaveDescription] = useState("");
    const [isLibraryLoading, setIsLibraryLoading] = useState(false);
    const [isSavingCriterion, setIsSavingCriterion] = useState(false);
    const [isSavingRubric, setIsSavingRubric] = useState(false);
    const [isDeletingCriterion, setIsDeletingCriterion] = useState(false);
    const [isDeletingRubric, setIsDeletingRubric] = useState(false);
    const [criterionDeleteTarget, setCriterionDeleteTarget] = useState<RubricCriterionLibraryItem | null>(null);
    const [criterionRemoveTarget, setCriterionRemoveTarget] = useState<RubricCriteria | null>(null);
    const [rubricDeleteTarget, setRubricDeleteTarget] = useState<RubricLibraryItem | null>(null);
    const [pendingRubricSelection, setPendingRubricSelection] = useState<RubricLibraryItem | null>(null);
    const [isRemovingFromActivity, setIsRemovingFromActivity] = useState(false);

    const selected = rubric.find((criterion) => criterion.id === selectedId) ?? null;
    const linkedLibraryCriterion = selected?.source_criterion_id
        ? libraryCriteria.find((criterion) => criterion.id === selected.source_criterion_id) ?? null
        : null;
    const rubricSource = deriveRubricSource(rubric);
    const linkedLibraryRubric = rubricSource
        ? libraryRubrics.find((savedRubric) => savedRubric.id === rubricSource.id) ?? null
        : null;
    const hasCriterionUpdateAvailable = Boolean(
        selected &&
        linkedLibraryCriterion &&
        (selected.source_version ?? 0) < linkedLibraryCriterion.version
    );
    const hasRubricUpdateAvailable = Boolean(
        rubricSource &&
        linkedLibraryRubric &&
        rubricSource.version < linkedLibraryRubric.version
    );

    useEffect(() => {
        if (!open) return;
        setSelectedId((current) => {
            if (current && rubric.some((criterion) => criterion.id === current)) return current;
            return rubric[0]?.id ?? null;
        });
    }, [open, rubric]);

    useEffect(() => {
        if (!open) return;

        let isMounted = true;
        setIsLibraryLoading(true);

        async function loadLibraries() {
            try {
                const supabase = createSupabaseClient();
                const { data: authResult, error: authError } = await supabase.auth.getUser();
                const user = authResult.user;

                if (authError || !user) {
                    throw new Error(authError?.message ?? "No autenticado.");
                }

                const [criteriaResult, rubricResult] = await Promise.allSettled([
                    supabase
                        .from("rubric_criteria_library")
                        .select("*")
                        .or(`created_by.eq.${user.id},visibility.eq.public`)
                        .order("updated_at", { ascending: false }),
                    supabase
                        .from("rubric_library")
                        .select("*")
                        .or(`created_by.eq.${user.id},visibility.eq.public`)
                        .order("updated_at", { ascending: false }),
                ]);

                if (!isMounted) return;

                if (criteriaResult.status === "fulfilled") {
                    if (criteriaResult.value.error) {
                        toast.error(`Error al cargar criterios guardados: ${criteriaResult.value.error.message}`);
                        setLibraryCriteria([]);
                    } else {
                        setLibraryCriteria((criteriaResult.value.data ?? []).map((criterion: any) => ({
                            ...criterion,
                            levels: normalizeRubricLevels((criterion.levels ?? []) as RubricLevel[]),
                            is_owner: criterion.created_by === user.id,
                        })));
                    }
                } else {
                    toast.error("Error inesperado al cargar criterios guardados");
                    setLibraryCriteria([]);
                    console.error("Rubric criteria library load failed:", criteriaResult.reason);
                }

                if (rubricResult.status === "fulfilled") {
                    if (rubricResult.value.error) {
                        toast.error(`Error al cargar rúbricas guardadas: ${rubricResult.value.error.message}`);
                        setLibraryRubrics([]);
                    } else {
                        setLibraryRubrics((rubricResult.value.data ?? []).map((savedRubric: any) => ({
                            ...savedRubric,
                            criteria: hydrateRubricCriteria((savedRubric.criteria ?? []) as RubricCriteria[]),
                            is_owner: savedRubric.created_by === user.id,
                        })));
                    }
                } else {
                    toast.error("Error inesperado al cargar rúbricas guardadas");
                    setLibraryRubrics([]);
                    console.error("Rubric library load failed:", rubricResult.reason);
                }
            } finally {
                if (isMounted) {
                    setIsLibraryLoading(false);
                }
            }
        }

        void loadLibraries();

        return () => {
            isMounted = false;
        };
    }, [open]);

    useEffect(() => {
        if (!selected) return;
        setSaveCriterionVisibility(selected.source_visibility ?? linkedLibraryCriterion?.visibility ?? "private");
    }, [selected, linkedLibraryCriterion]);

    function addNewCriterion() {
        const newCriterion = buildBlankCriterion();
        const nextRubric = [...rubric, newCriterion];
        onChange(nextRubric);
        setSelectedId(newCriterion.id);
    }

    function insertSavedCriterion(criterion: RubricCriterionLibraryItem) {
        const snapshot = buildSnapshotCriterion(criterion);
        const nextRubric = [...rubric, snapshot];
        onChange(nextRubric);
        setSelectedId(snapshot.id);
        setOverlayMode(null);
        toast.success(`Criterio "${criterion.name}" insertado`);
    }

    function applySavedRubric(savedRubric: RubricLibraryItem) {
        const nextRubric = buildSnapshotRubric(savedRubric);
        onChange(nextRubric);
        setSelectedId(nextRubric[0]?.id ?? null);
        toast.success(`Rúbrica "${savedRubric.name}" aplicada`);
    }

    function handleLibraryRubricSelection(savedRubric: RubricLibraryItem) {
        if (rubric.length > 0) {
            setPendingRubricSelection(savedRubric);
            return;
        }

        applySavedRubric(savedRubric);
    }

    function removeCriterion(id: string) {
        const nextRubric = rubric.filter((criterion) => criterion.id !== id);
        onChange(nextRubric);
        if (selectedId === id) {
            setSelectedId(nextRubric[0]?.id ?? null);
        }
    }

    function updateCriterion(id: string, patch: Partial<RubricCriteria>) {
        onChange(rubric.map((criterion) => criterion.id === id ? { ...criterion, ...patch } : criterion));
    }

    function addLevel(criterionId: string) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        const nextPoints = Math.max(-1, ...(criterion.levels ?? []).map((level) => level.points ?? 0)) + 1;
        const newLevel: RubricLevel = { id: crypto.randomUUID(), label: "", points: nextPoints, description: "" };
        updateCriterion(criterionId, { levels: [...(criterion.levels ?? []), newLevel] });
    }

    function removeLevel(criterionId: string, levelId: string) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, { levels: (criterion.levels ?? []).filter((level) => level.id !== levelId) });
    }

    function updateLevel(criterionId: string, levelId: string, patch: Partial<RubricLevel>) {
        const criterion = rubric.find((item) => item.id === criterionId);
        if (!criterion) return;
        updateCriterion(criterionId, {
            levels: (criterion.levels ?? []).map((level) => level.id === levelId ? { ...level, ...patch } : level),
        });
    }

    function openSaveCriterionPanel() {
        if (!selected) return;

        const validationError = getRubricValidationError([selected]);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setSaveCriterionVisibility(selected.source_visibility ?? linkedLibraryCriterion?.visibility ?? "private");
        setOverlayMode("criterion-save");
    }

    function openSaveRubricPanel() {
        const validationError = getRubricValidationError(rubric);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setSaveRubricVisibility(rubricSource?.visibility ?? linkedLibraryRubric?.visibility ?? "private");
        setRubricSaveName(linkedLibraryRubric?.name ?? buildRubricDraftName(rubric));
        setRubricSaveDescription(linkedLibraryRubric?.description ?? "");
        setOverlayMode("rubric-save");
    }

    async function handleSaveCriterion() {
        if (!selected) return;

        setIsSavingCriterion(true);
        try {
            const supabase = createSupabaseClient();
            const { data: authResult, error: authError } = await supabase.auth.getUser();
            const user = authResult.user;
            if (authError || !user) throw new Error(authError?.message ?? "No autenticado.");

            const payload = {
                name: selected.name,
                description: selected.description ?? "",
                levels: selected.levels ?? [],
            };

            const isUpdate = Boolean(
                linkedLibraryCriterion?.is_owner &&
                selected.source_criterion_id === linkedLibraryCriterion.id
            );

            let criterionResult: RubricCriterionLibraryItem | null = null;

            if (isUpdate) {
                const { data: existing, error: existingError } = await supabase
                    .from("rubric_criteria_library")
                    .select("id, created_by, version")
                    .eq("id", linkedLibraryCriterion!.id)
                    .single();

                if (existingError || !existing) throw new Error(existingError?.message ?? "No se encontró el criterio guardado.");
                if (existing.created_by !== user.id) throw new Error("Sin permisos.");

                const { data, error } = await supabase
                    .from("rubric_criteria_library")
                    .update({
                        name: payload.name.trim(),
                        description: payload.description.trim() || null,
                        levels: normalizeRubricLevels(payload.levels),
                        visibility: saveCriterionVisibility,
                        version: (existing.version ?? 1) + 1,
                    })
                    .eq("id", linkedLibraryCriterion!.id)
                    .select("*")
                    .single();

                if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar el criterio guardado.");
                criterionResult = {
                    ...data,
                    levels: normalizeRubricLevels((data.levels ?? []) as RubricLevel[]),
                    is_owner: true,
                };
            } else {
                const { data, error } = await supabase
                    .from("rubric_criteria_library")
                    .insert({
                        name: payload.name.trim(),
                        description: payload.description.trim() || null,
                        levels: normalizeRubricLevels(payload.levels),
                        visibility: saveCriterionVisibility,
                        created_by: user.id,
                    })
                    .select("*")
                    .single();

                if (error || !data) throw new Error(error?.message ?? "No se pudo guardar el criterio.");
                criterionResult = {
                    ...data,
                    levels: normalizeRubricLevels((data.levels ?? []) as RubricLevel[]),
                    is_owner: true,
                };
            }

            if (!criterionResult) throw new Error("No se pudo guardar el criterio.");

            setLibraryCriteria((current) => [
                criterionResult,
                ...current.filter((criterion) => criterion.id !== criterionResult.id),
            ]);

            updateCriterion(selected.id, {
                source_criterion_id: criterionResult.id,
                source_version: criterionResult.version,
                source_visibility: criterionResult.visibility,
            });

            toast.success(isUpdate ? "Criterio guardado actualizado" : "Criterio guardado correctamente");
            setOverlayMode(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el criterio.");
        } finally {
            setIsSavingCriterion(false);
        }
    }

    async function handleSaveRubric() {
        const validationError = getRubricValidationError(rubric);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        if (!rubricSaveName.trim()) {
            toast.error("Ponle nombre a la rúbrica antes de guardarla.");
            return;
        }

        setIsSavingRubric(true);
        try {
            const supabase = createSupabaseClient();
            const { data: authResult, error: authError } = await supabase.auth.getUser();
            const user = authResult.user;
            if (authError || !user) throw new Error(authError?.message ?? "No autenticado.");

            const payload = {
                name: rubricSaveName.trim(),
                description: rubricSaveDescription.trim(),
                criteria: normalizeRubricCriteria(rubric),
            };

            const isUpdate = Boolean(
                linkedLibraryRubric?.is_owner &&
                rubricSource &&
                linkedLibraryRubric.id === rubricSource.id
            );

            let rubricResult: RubricLibraryItem | null = null;

            if (isUpdate) {
                const { data: existing, error: existingError } = await supabase
                    .from("rubric_library")
                    .select("id, created_by, version")
                    .eq("id", linkedLibraryRubric!.id)
                    .single();

                if (existingError || !existing) throw new Error(existingError?.message ?? "No se encontró la rúbrica guardada.");
                if (existing.created_by !== user.id) throw new Error("Sin permisos.");

                const { data, error } = await supabase
                    .from("rubric_library")
                    .update({
                        name: payload.name,
                        description: payload.description || null,
                        criteria: payload.criteria,
                        visibility: saveRubricVisibility,
                        version: (existing.version ?? 1) + 1,
                    })
                    .eq("id", linkedLibraryRubric!.id)
                    .select("*")
                    .single();

                if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar la rúbrica guardada.");
                rubricResult = {
                    ...data,
                    criteria: hydrateRubricCriteria((data.criteria ?? []) as RubricCriteria[]),
                    is_owner: true,
                };
            } else {
                const { data, error } = await supabase
                    .from("rubric_library")
                    .insert({
                        name: payload.name,
                        description: payload.description || null,
                        criteria: payload.criteria,
                        visibility: saveRubricVisibility,
                        created_by: user.id,
                    })
                    .select("*")
                    .single();

                if (error || !data) throw new Error(error?.message ?? "No se pudo guardar la rúbrica.");
                rubricResult = {
                    ...data,
                    criteria: hydrateRubricCriteria((data.criteria ?? []) as RubricCriteria[]),
                    is_owner: true,
                };
            }

            if (!rubricResult) throw new Error("No se pudo guardar la rúbrica.");

            setLibraryRubrics((current) => [
                rubricResult,
                ...current.filter((savedRubric) => savedRubric.id !== rubricResult.id),
            ]);

            const nextRubric = rubric.map((criterion) => ({
                ...criterion,
                source_rubric_id: rubricResult.id,
                source_rubric_version: rubricResult.version,
                source_rubric_visibility: rubricResult.visibility,
            }));
            onChange(nextRubric);

            toast.success(isUpdate ? "Rúbrica guardada actualizada" : "Rúbrica guardada correctamente");
            setOverlayMode(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la rúbrica.");
        } finally {
            setIsSavingRubric(false);
        }
    }

    function applyCriterionLibraryUpdate() {
        if (!selected || !linkedLibraryCriterion) return;
        updateCriterion(selected.id, {
            name: linkedLibraryCriterion.name,
            description: linkedLibraryCriterion.description ?? "",
            levels: cloneLevels(linkedLibraryCriterion.levels),
            source_criterion_id: linkedLibraryCriterion.id,
            source_version: linkedLibraryCriterion.version,
            source_visibility: linkedLibraryCriterion.visibility,
        });
        toast.success("Criterio actualizado desde la biblioteca");
    }

    function applyRubricLibraryUpdate() {
        if (!linkedLibraryRubric) return;
        const nextRubric = buildSnapshotRubric(linkedLibraryRubric);
        onChange(nextRubric);
        setSelectedId(nextRubric[0]?.id ?? null);
        toast.success("Rúbrica actualizada desde la biblioteca");
    }

    async function handleDeleteCriterionLibrary() {
        if (!criterionDeleteTarget) return;

        setIsDeletingCriterion(true);
        try {
            const supabase = createSupabaseClient();
            const { error } = await supabase
                .from("rubric_criteria_library")
                .delete()
                .eq("id", criterionDeleteTarget.id);

            if (error) throw new Error(error.message);

            setLibraryCriteria((current) => current.filter((criterion) => criterion.id !== criterionDeleteTarget.id));
            onChange(rubric.map((criterion) => (
                criterion.source_criterion_id === criterionDeleteTarget.id
                    ? {
                        ...criterion,
                        source_criterion_id: undefined,
                        source_version: undefined,
                        source_visibility: undefined,
                    }
                    : criterion
            )));
            toast.success("Criterio guardado eliminado");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el criterio guardado.");
        } finally {
            setIsDeletingCriterion(false);
            setCriterionDeleteTarget(null);
        }
    }

    async function handleDeleteRubricLibrary() {
        if (!rubricDeleteTarget) return;

        setIsDeletingRubric(true);
        try {
            const supabase = createSupabaseClient();
            const { error } = await supabase
                .from("rubric_library")
                .delete()
                .eq("id", rubricDeleteTarget.id);

            if (error) throw new Error(error.message);

            setLibraryRubrics((current) => current.filter((savedRubric) => savedRubric.id !== rubricDeleteTarget.id));
            onChange(rubric.map((criterion) => (
                criterion.source_rubric_id === rubricDeleteTarget.id
                    ? {
                        ...criterion,
                        source_rubric_id: undefined,
                        source_rubric_version: undefined,
                        source_rubric_visibility: undefined,
                    }
                    : criterion
            )));
            toast.success("Rúbrica guardada eliminada");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar la rúbrica guardada.");
        } finally {
            setIsDeletingRubric(false);
            setRubricDeleteTarget(null);
        }
    }

    function confirmRemoveRubricFromActivity() {
        onChange([]);
        setSelectedId(null);
        setIsRemovingFromActivity(false);
        toast.success("Rúbrica desvinculada de la actividad");
    }

    function confirmRemoveCriterionFromConstructor() {
        if (!criterionRemoveTarget) return;
        removeCriterion(criterionRemoveTarget.id);
        setCriterionRemoveTarget(null);
        toast.success("Criterio quitado del constructor");
    }

    function handleDownloadCSV() {
        if (rubric.length === 0) return;

        // Determinar el máximo número de niveles para las cabeceras
        const maxLevels = rubric.reduce((max, c) => Math.max(max, c.levels?.length ?? 0), 0);
        
        const headers = ["Criterio", "Descripción"];
        for (let i = 1; i <= maxLevels; i++) {
            headers.push(`Nivel ${i}`);
        }

        const rows = rubric.map(criterion => {
            const row = [
                criterion.name,
                criterion.description ?? ""
            ];

            // Añadir cada nivel como "Etiqueta (Puntos pts) - Descripción"
            for (let i = 0; i < maxLevels; i++) {
                const level = criterion.levels?.[i];
                if (level) {
                    const levelText = `${level.label} (${level.points} pts)${level.description ? ` - ${level.description}` : ""}`;
                    row.push(levelText);
                } else {
                    row.push("");
                }
            }
            return row;
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const fileName = (rubricSaveName || buildRubricDraftName(rubric)).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "-");
        
        a.href = url;
        a.download = `${fileName}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Rúbrica descargada en CSV");
    }

    const ownCriteria = libraryCriteria.filter((criterion) => criterion.is_owner);
    const publicCriteria = libraryCriteria.filter((criterion) => !criterion.is_owner && criterion.visibility === "public");
    const ownRubrics = libraryRubrics.filter((savedRubric) => savedRubric.is_owner);
    const publicRubrics = libraryRubrics.filter((savedRubric) => !savedRubric.is_owner && savedRubric.visibility === "public");

    return (
        <>
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
            <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 flex flex-col gap-0 overflow-hidden border-border-strong bg-surface [&>button:last-child]:hidden">
                <DialogHeader className="relative shrink-0 border-b border-border/50 p-6 pb-4">
                    <div className="flex items-start gap-4 pr-12">
                        <div className="min-w-0 flex-1 space-y-2">
                            <DialogTitle className="text-base font-bold">Configurar rúbrica</DialogTitle>
                            <DialogDescription>
                                Define criterios, niveles y reutiliza elementos guardados desde la biblioteca.
                            </DialogDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="border-accent-blue/20 bg-accent-blue/8 text-accent-blue">
                                    <Sparkles className="size-3.5" />
                                    {rubric.length} criterio{rubric.length === 1 ? "" : "s"}
                                </Badge>
                                <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                    {(rubric.reduce((count, criterion) => count + (criterion.levels?.length ?? 0), 0))} niveles
                                </Badge>
                                {linkedLibraryRubric ? (
                                    <Badge className="border-accent-blue/20 bg-accent-blue/8 text-accent-blue">
                                        Rúbrica guardada v{rubricSource?.version ?? linkedLibraryRubric.version}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                        Rúbrica no guardada
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-start">
                            {hasRubricUpdateAvailable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={applyRubricLibraryUpdate}
                                    className="h-8 gap-1.5 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                                >
                                    <RefreshCw className="size-3.5" />
                                    Actualizar rúbrica
                                </Button>
                            )}
                            {rubric.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsRemovingFromActivity(true)}
                                    className="h-8 border-border-strong bg-background text-text-muted hover:bg-surface-dark hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                    {linkedLibraryRubric ? "Desvincular de la actividad" : "Quitar rúbrica"}
                                </Button>
                            )}
                            {rubric.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadCSV}
                                    className="h-8 border-border-strong bg-background text-text-muted hover:bg-surface-dark hover:text-foreground"
                                >
                                    <Download className="size-3.5" />
                                    Descargar CSV
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openSaveRubricPanel}
                                className={cn(
                                    "h-8",
                                    linkedLibraryRubric?.is_owner && rubricSource?.id === linkedLibraryRubric.id
                                        ? getSavedActionClass(true)
                                        : "border-border/50 bg-surface-dark/40 text-accent-blue hover:border-accent-blue/30 hover:bg-accent-blue/10"
                                )}
                            >
                                <CloudUpload className="size-3.5" />
                                {linkedLibraryRubric?.is_owner && rubricSource?.id === linkedLibraryRubric.id
                                    ? "Actualizar rúbrica guardada"
                                    : "Guardar rúbrica"}
                            </Button>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute right-6 top-6 size-8 text-text-muted hover:bg-surface-dark hover:text-foreground"
                    >
                        <X className="size-4" />
                    </Button>
                </DialogHeader>

                <div className="relative flex-1 min-h-0">
                    <ResizablePanelGroup direction="horizontal" className="h-full">
                        <ResizablePanel defaultSize={14} minSize={14} maxSize={30}>
                            <div className="h-full flex flex-col bg-surface-dark/30 border-r border-border/50">
                                <div className="shrink-0 px-4 py-4 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-xl bg-accent-blue/8 text-accent-blue">
                                            <Layers className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Biblioteca</p>
                                            <p className="text-sm font-semibold text-foreground">Rúbricas guardadas</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-5">
                                    {isLibraryLoading ? (
                                        <p className="text-sm text-text-muted">Cargando biblioteca...</p>
                                    ) : ownRubrics.length === 0 && publicRubrics.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border/50 bg-surface-dark/40 p-4 text-sm text-text-muted">
                                            Todavía no hay rúbricas guardadas. Guarda la actual para reutilizarla.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Mis rúbricas</p>
                                                {ownRubrics.length === 0 ? (
                                                    <p className="text-sm text-text-muted">No has guardado ninguna todavía.</p>
                                                ) : (
                                                    ownRubrics.map((savedRubric) => (
                                                        <div key={savedRubric.id} className={libraryCardClass(rubricSource?.id === savedRubric.id)}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleLibraryRubricSelection(savedRubric)}
                                                                    className="min-w-0 flex-1 text-left"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-semibold text-foreground">{savedRubric.name}</p>
                                                                            {savedRubric.description && (
                                                                                <p className="mt-1 text-xs leading-relaxed text-text-muted">{savedRubric.description}</p>
                                                                            )}
                                                                        </div>
                                                                        <Badge className="shrink-0 border-accent-blue/25 bg-accent-blue/10 text-accent-blue">
                                                                            v{savedRubric.version}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                        <Badge variant="outline" className="border-border-strong bg-surface-dark/70 text-text-muted">
                                                                            {savedRubric.criteria.length} criterio{savedRubric.criteria.length === 1 ? "" : "s"}
                                                                        </Badge>
                                                                        <Badge className={cn(
                                                                            "border-transparent",
                                                                            savedRubric.visibility === "public"
                                                                                ? "bg-accent-blue/16 text-accent-blue"
                                                                                : "border-zinc-600/40 bg-zinc-700/14 text-zinc-800 dark:border-zinc-400/35 dark:bg-zinc-500/22 dark:text-zinc-100"
                                                                        )}>
                                                                            {savedRubric.visibility === "public" ? "Pública" : "Privada"}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-text-muted/70">
                                                                        Actualizada {formatUpdatedAt(savedRubric.updated_at)}
                                                                    </p>
                                                                </button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setRubricDeleteTarget(savedRubric)}
                                                                    disabled={isDeletingRubric}
                                                                    className="size-7 shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Públicas</p>
                                                {publicRubrics.length === 0 ? (
                                                    <p className="text-sm text-text-muted">No hay rúbricas públicas disponibles.</p>
                                                ) : (
                                                    publicRubrics.map((savedRubric) => (
                                                        <button
                                                            key={savedRubric.id}
                                                            type="button"
                                                            onClick={() => handleLibraryRubricSelection(savedRubric)}
                                                            className={libraryCardClass(rubricSource?.id === savedRubric.id)}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-semibold text-foreground">{savedRubric.name}</p>
                                                                    {savedRubric.description && (
                                                                        <p className="mt-1 text-xs leading-relaxed text-text-muted">{savedRubric.description}</p>
                                                                    )}
                                                                </div>
                                                                <Badge className="shrink-0 border-accent-blue/25 bg-accent-blue/10 text-accent-blue">
                                                                    v{savedRubric.version}
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                <Badge variant="outline" className="border-border-strong bg-surface-dark/70 text-text-muted">
                                                                    {savedRubric.criteria.length} criterio{savedRubric.criteria.length === 1 ? "" : "s"}
                                                                </Badge>
                                                                <Badge className="border-accent-blue/30 bg-accent-blue/16 text-accent-blue">
                                                                    Pública
                                                                </Badge>
                                                            </div>
                                                            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-text-muted/70">
                                                                Actualizada {formatUpdatedAt(savedRubric.updated_at)}
                                                            </p>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                        <ResizablePanel defaultSize={16} minSize={16} maxSize={30}>
                            <div className="h-full flex flex-col bg-surface-dark/20">
                                <div className="shrink-0 px-4 py-4 border-b border-border/50">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Constructor</p>
                                            <p className="text-sm font-semibold text-foreground">Criterios</p>
                                        </div>
                                        <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                            {rubric.length}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {rubric.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border/50 bg-surface-dark/40 p-4 text-center text-sm text-text-muted">
                                            Sin criterios. Usa <span className="font-semibold text-accent-blue">+ Criterio</span> o carga una rúbrica guardada.
                                        </div>
                                    )}

                                    {rubric.map((criterion) => {
                                        const criterionSource = criterion.source_criterion_id
                                            ? libraryCriteria.find((item) => item.id === criterion.source_criterion_id)
                                            : null;
                                        const criterionHasUpdate = Boolean(
                                            criterionSource &&
                                            (criterion.source_version ?? 0) < criterionSource.version
                                        );

                                        return (
                                            <div
                                                key={criterion.id}
                                                className={cn(
                                                    "w-full rounded-xl border p-3 text-left transition-all duration-200",
                                                    selectedId === criterion.id
                                                        ? "border-accent-blue/40 bg-accent-blue/8 shadow-[0_10px_26px_-20px_rgba(0,112,243,0.75)]"
                                                        : "border-border/50 bg-surface-dark/40 hover:border-border-strong hover:bg-surface-dark/70"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedId(criterion.id)}
                                                        className="min-w-0 flex-1 text-left"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="truncate text-sm font-semibold text-foreground">
                                                                {criterion.name || <span className="italic text-text-muted/60">Sin nombre</span>}
                                                            </span>
                                                            <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                                                {criterion.levels?.length ?? 0} niv.
                                                            </Badge>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            {criterion.source_criterion_id && (
                                                                <Badge className="border-accent-blue/30 bg-accent-blue/10 text-accent-blue">
                                                                    Guardado
                                                                </Badge>
                                                            )}
                                                            {criterion.source_rubric_id && (
                                                                <Badge variant="outline" className="border-border-strong bg-surface-dark/80 text-text-muted">
                                                                    Enlazado a rúbrica
                                                                </Badge>
                                                            )}
                                                            {criterionHasUpdate && (
                                                                <Badge className="border-amber-500/30 bg-amber-500/12 text-amber-300">
                                                                    Actualización disponible
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setCriterionRemoveTarget(criterion)}
                                                        className="size-7 shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="shrink-0 p-3 border-t border-border-strong">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full h-9 gap-1.5 border-accent-blue/30 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/16 hover:text-accent-blue"
                                            >
                                                <Plus className="size-3.5" />
                                                Criterio
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="z-[90] w-56 border-border-strong bg-popover/95 backdrop-blur-xl"
                                        >
                                            <DropdownMenuItem onClick={addNewCriterion} className="cursor-pointer gap-2 text-xs">
                                                <Plus className="size-3.5 text-accent-blue" />
                                                Nuevo criterio
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setOverlayMode("criterion-library")} className="cursor-pointer gap-2 text-xs">
                                                <Library className="size-3.5 text-accent-blue" />
                                                Usar criterio guardado
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                        <ResizablePanel defaultSize={52} minSize={34}>
                            <div className="h-full flex flex-col bg-surface overflow-y-auto">
                                {selected === null ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
                                        <div className="flex size-14 items-center justify-center rounded-3xl bg-surface-dark border border-border/50 text-accent-blue">
                                            <Sparkles className="size-6" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-foreground">Selecciona o añade un criterio</p>
                                            <p className="mt-1 text-sm text-text-muted">Aquí editarás nombres, descripciones y niveles.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-5 flex-1">
                                        <div className="rounded-xl border border-border/50 bg-surface-dark/40 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Estado</p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {selected.source_criterion_id ? (
                                                            <>
                                                                <Badge className="border-accent-blue/20 bg-accent-blue/8 text-accent-blue">
                                                                    Guardado v{selected.source_version ?? 1}
                                                                </Badge>
                                                                <Badge className={cn(
                                                                    "border-transparent",
                                                                    selected.source_visibility === "public"
                                                                        ? "bg-accent-blue/16 text-accent-blue"
                                                                        : "border-zinc-600/40 bg-zinc-700/14 text-zinc-800 dark:border-zinc-400/35 dark:bg-zinc-500/22 dark:text-zinc-100"
                                                                )}>
                                                                    {selected.source_visibility === "public" ? "Público" : "Privado"}
                                                                </Badge>
                                                            </>
                                                        ) : (
                                                            <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                                                No guardado
                                                            </Badge>
                                                        )}
                                                        {hasCriterionUpdateAvailable && (
                                                            <Badge className="border-amber-500/30 bg-amber-500/12 text-amber-300">
                                                                Actualización disponible
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-text-muted">
                                                        {selected.source_rubric_id
                                                            ? "Este criterio pertenece a una rúbrica guardada."
                                                            : "Puedes guardarlo como criterio reutilizable o mantenerlo solo en esta actividad."}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    {hasCriterionUpdateAvailable && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={applyCriterionLibraryUpdate}
                                                            className="h-8 gap-1.5 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                                                        >
                                                            <RefreshCw className="size-3.5" />
                                                            Actualizar criterio
                                                        </Button>
                                                    )}
                                                    {linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCriterionDeleteTarget(linkedLibraryCriterion)}
                                                            disabled={isDeletingCriterion}
                                                            className="h-8 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                            {isDeletingCriterion ? "Eliminando..." : "Eliminar de biblioteca"}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={openSaveCriterionPanel}
                                                        className={cn(
                                                            "h-8",
                                                            linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id
                                                                ? getSavedActionClass(true)
                                                                : "border-accent-blue/30 bg-background text-accent-blue hover:bg-accent-blue/16"
                                                        )}
                                                    >
                                                        <CloudUpload className="size-3.5" />
                                                        {linkedLibraryCriterion?.is_owner && selected.source_criterion_id === linkedLibraryCriterion.id
                                                            ? "Actualizar criterio guardado"
                                                            : "Guardar criterio"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Nombre del criterio</label>
                                            <Input
                                                value={selected.name}
                                                onChange={(event) => updateCriterion(selected.id, { name: event.target.value })}
                                                placeholder="Ej: Claridad de la explicación"
                                                className="border-border-strong bg-surface-dark/80 focus-visible:ring-accent-blue/30"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Descripción</label>
                                            <Textarea
                                                value={selected.description ?? ""}
                                                onChange={(event) => updateCriterion(selected.id, { description: event.target.value })}
                                                placeholder="Contexto general del criterio"
                                                rows={2}
                                                className="border-border-strong bg-surface-dark/80 resize-none text-sm focus-visible:ring-accent-blue/30"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Niveles</label>
                                                <Badge variant="outline" className="border-border/50 bg-surface-dark/50 text-text-muted">
                                                    {selected.levels?.length ?? 0} nivel{(selected.levels?.length ?? 0) === 1 ? "" : "es"}
                                                </Badge>
                                            </div>

                                            <div className="rounded-xl border border-border/50 bg-surface-dark/40 p-3 text-sm text-text-muted">
                                                La calificación usa los <span className="font-semibold text-foreground">puntos</span>, no el número visual del nivel.
                                                Recomendado: <span className="font-semibold text-foreground">Nivel 1 = 0 puntos</span> y subir de forma progresiva.
                                            </div>

                                            <div className="space-y-3">
                                                {(selected.levels ?? []).map((level, index) => (
                                                    <div
                                                        key={level.id}
                                                        className="group relative rounded-xl border border-border/50 bg-surface-dark/40 p-4 transition-colors hover:border-border-strong"
                                                    >
                                                        <button
                                                            onClick={() => removeLevel(selected.id, level.id)}
                                                            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
                                                            title="Eliminar nivel"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>

                                                        <div className="mb-3 flex items-center gap-2">
                                                            <Badge className="border-accent-blue/20 bg-accent-blue/8 text-accent-blue">
                                                                Nivel {index + 1}
                                                            </Badge>
                                                        </div>

                                                        <div className="mb-3 flex gap-4 pr-8">
                                                            <div className="flex-1 space-y-1.5">
                                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Etiqueta</label>
                                                                <Input
                                                                    value={level.label}
                                                                    onChange={(event) => updateLevel(selected.id, level.id, { label: event.target.value })}
                                                                    placeholder="Ej: Excelente"
                                                                    className="h-8 border-border/50 bg-surface-dark focus-visible:ring-accent-blue/30"
                                                                />
                                                            </div>
                                                            <div className="w-24 space-y-1.5">
                                                                <label className="block text-center text-[10px] font-bold text-text-muted uppercase tracking-widest">Puntos</label>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    step={0.5}
                                                                    value={level.points === 0 ? "" : level.points}
                                                                    placeholder="0"
                                                                    onChange={(event) => {
                                                                        const raw = event.target.value;
                                                                        const parsed = parseFloat(raw);
                                                                        updateLevel(selected.id, level.id, {
                                                                            points: Number.isNaN(parsed) ? 0 : parsed,
                                                                        });
                                                                    }}
                                                                    className="h-8 border-border/50 bg-surface-dark text-center font-mono focus-visible:ring-accent-blue/30"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Descripción</label>
                                                            <Textarea
                                                                value={level.description ?? ""}
                                                                onChange={(event) => updateLevel(selected.id, level.id, { description: event.target.value })}
                                                                placeholder="Describe qué se requiere para alcanzar este nivel"
                                                                rows={2}
                                                                className="border-border/50 bg-surface-dark resize-none text-sm focus-visible:ring-accent-blue/30"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addLevel(selected.id)}
                                                className="h-8 gap-1.5 border-accent-blue/30 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/16 hover:text-accent-blue"
                                            >
                                                <Plus className="size-3.5" />
                                                Añadir nivel
                                            </Button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>

                    {overlayMode !== null && (
                        <div className="absolute inset-0 z-85 flex items-center justify-center bg-black/60 p-6">
                            <div className="w-full max-w-3xl rounded-2xl border border-border-strong bg-surface shadow-lg">
                                <div className="flex items-center justify-between border-b border-border/50 px-6 py-5">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                                            {overlayMode === "criterion-library" ? "Biblioteca" : "Guardar"}
                                        </p>
                                        <h3 className="text-base font-semibold text-foreground">
                                            {overlayMode === "criterion-library" && "Usar criterio guardado"}
                                            {overlayMode === "criterion-save" && (linkedLibraryCriterion?.is_owner && selected?.source_criterion_id === linkedLibraryCriterion.id
                                                ? "Actualizar criterio guardado"
                                                : "Guardar criterio")}
                                            {overlayMode === "rubric-save" && (linkedLibraryRubric?.is_owner && rubricSource?.id === linkedLibraryRubric.id
                                                ? "Actualizar rúbrica guardada"
                                                : "Guardar rúbrica")}
                                        </h3>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setOverlayMode(null)}
                                        className="size-8 text-text-muted hover:bg-surface-dark hover:text-foreground"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>

                                {overlayMode === "criterion-library" && (
                                    <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
                                        {isLibraryLoading ? (
                                            <p className="text-sm text-text-muted">Cargando criterios guardados...</p>
                                        ) : ownCriteria.length === 0 && publicCriteria.length === 0 ? (
                                            <p className="text-sm text-text-muted">No hay criterios guardados disponibles.</p>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Mis criterios</p>
                                                    {ownCriteria.length === 0 ? (
                                                        <p className="text-sm text-text-muted">Todavía no has guardado criterios.</p>
                                                    ) : (
                                                        ownCriteria.map((criterion) => (
                                                            <button
                                                                key={criterion.id}
                                                                type="button"
                                                                onClick={() => insertSavedCriterion(criterion)}
                                                                className={libraryCardClass(false)}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-foreground">{criterion.name}</p>
                                                                        {criterion.description && (
                                                                            <p className="mt-1 text-xs leading-relaxed text-text-muted">{criterion.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <Badge className="border-accent-blue/25 bg-accent-blue/10 text-accent-blue">
                                                                        v{criterion.version}
                                                                    </Badge>
                                                                </div>
                                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                    <Badge variant="outline" className="border-border-strong bg-surface-dark/70 text-text-muted">
                                                                        {criterion.levels.length} nivel{criterion.levels.length === 1 ? "" : "es"}
                                                                    </Badge>
                                                                    <Badge className={cn(
                                                                        "border-transparent",
                                                                        criterion.visibility === "public"
                                                                            ? "bg-accent-blue/16 text-accent-blue"
                                                                            : "border-zinc-600/40 bg-zinc-700/14 text-zinc-800 dark:border-zinc-400/35 dark:bg-zinc-500/22 dark:text-zinc-100"
                                                                    )}>
                                                                        {criterion.visibility === "public" ? "Público" : "Privado"}
                                                                    </Badge>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Públicos</p>
                                                    {publicCriteria.length === 0 ? (
                                                        <p className="text-sm text-text-muted">No hay criterios públicos disponibles.</p>
                                                    ) : (
                                                        publicCriteria.map((criterion) => (
                                                            <button
                                                                key={criterion.id}
                                                                type="button"
                                                                onClick={() => insertSavedCriterion(criterion)}
                                                                className={libraryCardClass(false)}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-foreground">{criterion.name}</p>
                                                                        {criterion.description && (
                                                                            <p className="mt-1 text-xs leading-relaxed text-text-muted">{criterion.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <Badge className="border-accent-blue/25 bg-accent-blue/10 text-accent-blue">
                                                                        v{criterion.version}
                                                                    </Badge>
                                                                </div>
                                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                                    <Badge variant="outline" className="border-border-strong bg-surface-dark/70 text-text-muted">
                                                                        {criterion.levels.length} nivel{criterion.levels.length === 1 ? "" : "es"}
                                                                    </Badge>
                                                                    <Badge className="border-accent-blue/30 bg-accent-blue/16 text-accent-blue">
                                                                        Público
                                                                    </Badge>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {overlayMode === "criterion-save" && (
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nombre</Label>
                                            <Input value={selected?.name ?? ""} readOnly className="border-border-strong bg-surface-dark/80" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Visibilidad</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setSaveCriterionVisibility("private")}
                                                    className={cn(
                                                        "justify-start border-border-strong",
                                                        saveCriterionVisibility === "private" && "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                                                    )}
                                                >
                                                    Privado
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setSaveCriterionVisibility("public")}
                                                    className={cn(
                                                        "justify-start border-border-strong",
                                                        saveCriterionVisibility === "public" && "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                                                    )}
                                                >
                                                    Público
                                                </Button>
                                            </div>
                                            <p className="text-xs text-text-muted">
                                                Privado: solo tú. Público: cualquier profesor puede reutilizarlo.
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleSaveCriterion}
                                            disabled={isSavingCriterion}
                                            className={cn(
                                                "w-full gap-2",
                                                linkedLibraryCriterion?.is_owner && selected?.source_criterion_id === linkedLibraryCriterion.id
                                                    ? "border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                                                    : "bg-accent-blue text-white hover:bg-accent-blue/90"
                                            )}
                                        >
                                            <CloudUpload className="size-4" />
                                            {isSavingCriterion ? "Guardando..." : linkedLibraryCriterion?.is_owner && selected?.source_criterion_id === linkedLibraryCriterion.id
                                                ? "Actualizar criterio guardado"
                                                : "Guardar criterio"}
                                        </Button>
                                    </div>
                                )}

                                {overlayMode === "rubric-save" && (
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nombre</Label>
                                            <Input
                                                value={rubricSaveName}
                                                onChange={(event) => setRubricSaveName(event.target.value)}
                                                placeholder="Ej: Rúbrica de proyecto final"
                                                className="border-border-strong bg-surface-dark/80"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Descripción</Label>
                                            <Textarea
                                                value={rubricSaveDescription}
                                                onChange={(event) => setRubricSaveDescription(event.target.value)}
                                                placeholder="Contexto y uso recomendado de esta rúbrica"
                                                rows={3}
                                                className="border-border-strong bg-surface-dark/80 resize-none"
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/8 p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="border-accent-blue/30 bg-accent-blue/10 text-accent-blue">
                                                    {rubric.length} criterio{rubric.length === 1 ? "" : "s"}
                                                </Badge>
                                                <Badge variant="outline" className="border-border-strong bg-surface-dark/80 text-text-muted">
                                                    {rubric.reduce((count, criterion) => count + (criterion.levels?.length ?? 0), 0)} niveles
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Visibilidad</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setSaveRubricVisibility("private")}
                                                    className={cn(
                                                        "justify-start border-border-strong",
                                                        saveRubricVisibility === "private" && "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                                                    )}
                                                >
                                                    Privada
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setSaveRubricVisibility("public")}
                                                    className={cn(
                                                        "justify-start border-border-strong",
                                                        saveRubricVisibility === "public" && "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                                                    )}
                                                >
                                                    Pública
                                                </Button>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSaveRubric}
                                            disabled={isSavingRubric}
                                            className={cn(
                                                "w-full gap-2",
                                                linkedLibraryRubric?.is_owner && rubricSource?.id === linkedLibraryRubric.id
                                                    ? "border border-emerald-600/35 bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:border-emerald-500/30 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                                                    : "bg-accent-blue text-white hover:bg-accent-blue/90"
                                            )}
                                        >
                                            <CloudUpload className="size-4" />
                                            {isSavingRubric ? "Guardando..." : linkedLibraryRubric?.is_owner && rubricSource?.id === linkedLibraryRubric.id
                                                ? "Actualizar rúbrica guardada"
                                                : "Guardar rúbrica"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
        <AlertDialog open={!!criterionDeleteTarget} onOpenChange={(nextOpen) => !nextOpen && setCriterionDeleteTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar criterio guardado?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {criterionDeleteTarget
                            ? `Se eliminará "${criterionDeleteTarget.name}" de tu biblioteca. Los criterios ya insertados en actividades se mantendrán, pero perderán el enlace con la versión guardada.`
                            : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingCriterion}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteCriterionLibrary}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeletingCriterion ? "Eliminando..." : "Eliminar criterio"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!criterionRemoveTarget} onOpenChange={(nextOpen) => !nextOpen && setCriterionRemoveTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Quitar criterio del constructor?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {criterionRemoveTarget
                            ? `Se quitará "${criterionRemoveTarget.name || "este criterio"}" de la rúbrica actual. Si estaba guardado en biblioteca, seguirá existiendo allí.`
                            : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmRemoveCriterionFromConstructor}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Quitar del constructor
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!rubricDeleteTarget} onOpenChange={(nextOpen) => !nextOpen && setRubricDeleteTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar rúbrica guardada?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {rubricDeleteTarget
                            ? `Se eliminará "${rubricDeleteTarget.name}" de tu biblioteca. Las actividades que la estaban usando conservarán sus criterios, pero perderán el enlace con la rúbrica guardada.`
                            : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingRubric}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteRubricLibrary}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeletingRubric ? "Eliminando..." : "Eliminar rúbrica"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!pendingRubricSelection} onOpenChange={(nextOpen) => !nextOpen && setPendingRubricSelection(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Cargar otra rúbrica?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {pendingRubricSelection
                            ? `Vas a reemplazar la rúbrica actual por "${pendingRubricSelection.name}". Los cambios que tengas ahora en la actividad se sobrescribirán.`
                            : ""}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            if (!pendingRubricSelection) return;
                            applySavedRubric(pendingRubricSelection);
                            setPendingRubricSelection(null);
                        }}
                        className="bg-accent-blue text-white hover:bg-accent-blue/90"
                    >
                        Reemplazar rúbrica
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isRemovingFromActivity} onOpenChange={setIsRemovingFromActivity}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {linkedLibraryRubric ? "¿Desvincular rúbrica de la actividad?" : "¿Quitar rúbrica de la actividad?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {linkedLibraryRubric
                            ? "La rúbrica se quitará de esta actividad, pero seguirá existiendo en tu biblioteca para reutilizarla cuando quieras."
                            : "La rúbrica actual no está guardada en biblioteca. Si la quitas de la actividad, se eliminarán todos sus criterios."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmRemoveRubricFromActivity}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {linkedLibraryRubric ? "Desvincular" : "Quitar rúbrica"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
