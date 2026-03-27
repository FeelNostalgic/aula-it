import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gamificación Global</h2>
                    <p className="text-muted-foreground">
                        Gestiona los objetivos cooperativos y recompensas de tu clase.
                    </p>
                </div>
            </div>

            <Separator className="bg-border/50" />

            <Card className="bg-card/50 border-border/50 max-w-2xl">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Target className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-lg">Los objetivos ahora son por unidad didáctica</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                            Los objetivos se configuran desde cada unidad didáctica directamente.
                            Accede a cualquier unidad, abre la pestaña <strong>OBJETIVO</strong> y define el objetivo cooperativo para esa unidad.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/30">
                        <Trophy className="size-5 text-amber-500 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                            Cada unidad puede tener un único objetivo activo. Los alumnos lo verán en la pestaña OBJETIVO de la unidad cuando esté activado.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
