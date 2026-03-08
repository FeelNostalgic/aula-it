import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
    Trophy,
    Users,
    Target,
    Gift,
    MoreVertical,
    Edit,
    Trash2,
    CheckCircle2,
    Clock,
    Archive,
    DraftingCompass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MilestoneForm } from "./milestone-form";
import { deleteMilestone } from "./actions";
import { Separator } from "@/components/ui/separator";

export default async function TeacherGamificationPage() {
    const supabase = await createClient();

    // Check auth and role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") redirect("/dashboard");

    // Fetch all milestones
    const { data: milestones } = await supabase
        .from("class_milestones")
        .select("*")
        .order("created_at", { ascending: false });

    const activeMilestone = milestones?.find(m => m.status === 'active');
    const totalMilestones = milestones?.length || 0;
    const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gamificación Global</h2>
                    <p className="text-muted-foreground">
                        Gestiona los objetivos cooperativos y recompensas para toda la clase.
                    </p>
                </div>
                <MilestoneForm />
            </div>

            <Separator className="bg-border/50" />

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hitos Totales</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalMilestones}</div>
                        <p className="text-xs text-muted-foreground">Historial acumulado</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hitos Completados</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedMilestones}</div>
                        <p className="text-xs text-muted-foreground">Objetivos logrados con éxito</p>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium italic text-primary">Estado Actual</CardTitle>
                        <Target className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {activeMilestone ? "Hito Activo" : "Sin Hito Activo"}
                        </div>
                        <p className="text-xs text-primary/60">
                            {activeMilestone ? activeMilestone.title : "Define uno para empezar"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Milestones List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
                    <Archive className="size-5 text-muted-foreground" />
                    LISTA DE HITOS
                </h3>

                <div className="grid gap-4">
                    {milestones?.map((milestone) => (
                        <Card key={milestone.id} className="overflow-hidden bg-card/30 border-border/30 hover:border-primary/30 transition-all group">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-background border border-border/50">
                                            {milestone.status === 'active' && <Clock className="size-6 text-primary animate-pulse" />}
                                            {milestone.status === 'completed' && <CheckCircle2 className="size-6 text-green-500" />}
                                            {milestone.status === 'draft' && <DraftingCompass className="size-6 text-muted-foreground" />}
                                            {milestone.status === 'archived' && <Archive className="size-6 text-muted-foreground/50" />}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                                                    {milestone.title}
                                                </h4>
                                                <Badge variant={
                                                    milestone.status === 'active' ? 'default' :
                                                        milestone.status === 'completed' ? 'secondary' :
                                                            'outline'
                                                } className="font-mono text-[10px] uppercase">
                                                    {milestone.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground max-w-xl line-clamp-1 italic">
                                                {milestone.description || "Sin descripción"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Objetivo</span>
                                            <span className="font-bold text-foreground">{milestone.target_points.toLocaleString()} XP</span>
                                        </div>

                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Recompensa</span>
                                            <span className="font-bold text-accent-amber">{milestone.reward}</span>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="hover:bg-accent/10">
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <MilestoneForm initialData={milestone} trigger={
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 cursor-pointer">
                                                        <Edit className="size-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                } />
                                                <DropdownMenuItem
                                                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                                    onSelect={async () => {
                                                        if (confirm("¿Estás seguro de eliminar este hito?")) {
                                                            await deleteMilestone(milestone.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {milestone.status === 'active' && (
                                    <div className="h-1 bg-primary/20">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.min(100, (milestone.current_points / milestone.target_points) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {milestones?.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-border/30 rounded-3xl bg-card/20">
                            <DraftingCompass className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-muted-foreground">No hay hitos definidos</h4>
                            <p className="text-sm text-muted-foreground/60 mb-6">Empieza creando el primer objetivo cooperativo para tus alumnos.</p>
                            <MilestoneForm />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
