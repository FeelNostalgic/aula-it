import { useState, useMemo } from "react";
import { Award, Plus, Trash2, Edit2, CheckCircle, XCircle, HardDrive, List, LayoutGrid, AlertCircle } from "lucide-react";
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
import { createClassBadge, updateClassBadge, deleteClassBadge } from "@/app/dashboard/units/[id]/actions";
import { ClassBadge } from "@/types/database";
import { BadgeDisplay } from "./badge-display";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";

interface ClassBadgesManagerProps {
    badges: ClassBadge[];
    unitId: string;
    activityId?: string;
}

export default function ClassBadgesManager({ badges, unitId, activityId }: ClassBadgesManagerProps) {
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
    const [conditionOperator, setConditionOperator] = useState("eq");
    const [conditionValue, setConditionValue] = useState("100");
    const [xpReward, setXpReward] = useState("0");
    const [activeTab, setActiveTab] = useState("general");

    const filteredBadges = useMemo(() => {
        if (activityId) {
            return badges.filter(b => b.activity_id === activityId);
        }
        return badges.filter(b => b.activity_id === null);
    }, [badges, activityId]);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setIconUrl("");
        setIsHidden(true);
        setConditionField(activityId ? "score" : "unit_completion");
        setConditionOperator("eq");
        setConditionValue("100");
        setXpReward("0");
        setIsCreating(false);
        setIsEditing(null);
        setActiveTab("general");
    };

    const handleCreate = async () => {
        if (!title) return toast.error("El título es obligatorio");
        setIsLoading(true);
        
        const payload = {
            allOf: [
                {
                    field: conditionField,
                    operator: conditionOperator,
                    value: conditionField === 'specific_activity_completed' ? activityId : (parseInt(conditionValue, 10) || 100)
                }
            ]
        };

        const { error } = await createClassBadge(unitId, {
            title,
            description,
            icon_url: iconUrl || null,
            is_hidden: isHidden,
            condition_payload: payload,
            activity_id: activityId || null,
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
        
        const payload = {
            allOf: [
                {
                    field: conditionField,
                    operator: conditionOperator,
                    value: conditionField === 'specific_activity_completed' ? activityId : (parseInt(conditionValue, 10) || 100)
                }
            ]
        };

        const { error } = await updateClassBadge(id, unitId, {
            title,
            description,
            icon_url: iconUrl || null,
            is_hidden: isHidden,
            condition_payload: payload,
            activity_id: activityId || null,
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
        
        try {
            const payload: any = badge.condition_payload;
            const condition = payload?.allOf?.[0] || payload?.all?.[0] || payload?.[0];
            if (condition) {
                setConditionField(condition.field || condition.fact?.replace('submission.', '') || "score");
                setConditionOperator(condition.operator || "eq");
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
            
            let fieldLabel = "";
            if (field === 'score') fieldLabel = "Nota";
            else if (field === 'average_score') fieldLabel = "Media";
            else if (field === 'unit_completion') fieldLabel = "Progreso";
            else if (field === 'specific_activity_completed') fieldLabel = "Completar actividad";
            else if (field === 'first_attempt_score') fieldLabel = "Nota 1er Intento";
            else if (field === 'steps_completed') fieldLabel = "Pasos";
            else if (field === 'activities_completed') fieldLabel = "Actividades";
            else if (field === 'total_xp') fieldLabel = "XP";
            else if (field === 'streak_days') fieldLabel = "Racha";
            else fieldLabel = field;
            
            if (field === 'specific_activity_completed') return fieldLabel;
            
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

    return (
        <div className="space-y-6">
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
                        className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-black uppercase tracking-widest text-[10px] px-4 rounded-xl h-9 gap-2 shadow-lg shadow-accent-blue/20"
                    >
                        <Plus className="size-4" strokeWidth={3} />
                        Nueva Insignia
                    </Button>
                </div>
            </div>

            <Dialog 
                open={isCreating || !!isEditing} 
                onOpenChange={(open) => !open && resetForm()}
                modal={false}
            >
                <DialogContent 
                    className="max-w-3xl bg-surface border-border-strong p-0 overflow-hidden"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>{isEditing ? "Editar Insignia" : "Nueva Insignia"}</DialogTitle>
                        <DialogDescription>Configura los detalles y las reglas de obtención.</DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[480px]">
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
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label className="text-base font-bold">Regla de Desbloqueo</Label>
                                        <div className="space-y-4 p-4 border border-border/50 rounded-xl bg-surface-dark/50">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-text-muted">Propiedad a evaluar</Label>
                                                <Select 
                                                    value={conditionField} 
                                                    onValueChange={setConditionField}
                                                >
                                                    <SelectTrigger className="w-full bg-surface border-border/50 h-10">
                                                        <SelectValue placeholder="Selecciona propiedad" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-surface border-border-strong">
                                                        {activityId ? (
                                                            <>
                                                                <SelectItem value="score">Nota de este Reto (0-100)</SelectItem>
                                                                <SelectItem value="first_attempt_score">Nota Primer Intento (0-100)</SelectItem>
                                                                <SelectItem value="steps_completed">Pasos Completados</SelectItem>
                                                                <SelectItem value="specific_activity_completed">Completar este Reto</SelectItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <SelectItem value="average_score">Nota Media Unidad (0-100)</SelectItem>
                                                                <SelectItem value="unit_completion">% Completado Unidad (0-100)</SelectItem>
                                                                <SelectItem value="activities_completed">Actividades completadas</SelectItem>
                                                                <SelectItem value="total_xp">XP Total Acumulado</SelectItem>
                                                                <SelectItem value="streak_days">Racha de Días</SelectItem>
                                                            </>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {conditionField !== 'specific_activity_completed' && (
                                                <div className="space-y-4 pt-4 border-t border-border/30">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-text-muted">Operador</Label>
                                                        <Select 
                                                            value={conditionOperator} 
                                                            onValueChange={setConditionOperator}
                                                        >
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

                                            {conditionField === 'specific_activity_completed' && (
                                                <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                                                    <p className="text-xs text-accent-blue font-medium leading-relaxed">
                                                        La insignia se otorgará automáticamente al completar satisfactoriamente este reto.
                                                    </p>
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
                            className="bg-accent-blue hover:bg-accent-blue/90 text-white min-w-[120px]"
                        >
                            {isLoading ? "Guardando..." : "Guardar Insignia"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
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
                        <Button onClick={() => setIsCreating(true)} variant="outline" className="border-accent-blue/30 text-accent-blue hover:bg-accent-blue hover:text-white transition-all">
                            <Plus className="size-4 mr-2" />
                            Crear Primera Insignia
                        </Button>
                    </div>
                )}
            </div>

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
