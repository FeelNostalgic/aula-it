"use client";

import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { createTeacher, resetTeacherPassword, toggleTeacherStatus, deleteTeacher, listTeachers, type Teacher } from "./actions";
import { UserPlus, Loader2, RotateCcw, Ban, CheckCircle, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} className="w-full h-11 font-bold" type="submit">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      {pending ? "Creando..." : "Crear profesor"}
    </Button>
  );
}

export function TeacherPanel({ initialTeachers }: { initialTeachers: Teacher[] }) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [createState, createAction] = useActionState(createTeacher, null);
  const [resetingId, setResetingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);

  useEffect(() => {
    setTeachers(initialTeachers);
  }, [initialTeachers]);

  useEffect(() => {
    if (createState?.success) {
      toast.success("Profesor creado correctamente. Debe cambiar su contraseña en el primer acceso.");
      listTeachers().then(({ teachers: refreshed }) => {
        if (refreshed) setTeachers(refreshed);
      });
    }
  }, [createState]);

  async function handleReset(teacher: Teacher) {
    if (!newPassword || newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoadingId(teacher.id);
    const run = async () => {
      const result = await resetTeacherPassword(teacher.id, newPassword);
      if (result?.error) throw new Error(result.error);
      setResetingId(null);
      setNewPassword("");
    };
    await toast.promise(run(), {
      loading: "Reseteando contraseña...",
      success: `Contraseña de ${teacher.name} actualizada`,
      error: (e: Error) => e.message,
    });
    setLoadingId(null);
  }

  async function handleToggle(teacher: Teacher) {
    const willBeBanned = !teacher.banned;
    setLoadingId(teacher.id);
    const run = async () => {
      const result = await toggleTeacherStatus(teacher.id, willBeBanned);
      if (result?.error) throw new Error(result.error);
      // Refrescar desde el servidor para garantizar que el estado de ban es el real
      const { teachers: refreshed } = await listTeachers();
      if (refreshed) setTeachers(refreshed);
    };
    await toast.promise(run(), {
      loading: willBeBanned ? "Bloqueando cuenta..." : "Activando cuenta...",
      success: willBeBanned ? `${teacher.name} bloqueado` : `${teacher.name} activado`,
      error: (e: Error) => e.message,
    });
    setLoadingId(null);
  }

  async function handleDelete(teacher: Teacher) {
    setDeleteTarget(null);
    setLoadingId(teacher.id);
    const run = async () => {
      const result = await deleteTeacher(teacher.id);
      if (result?.error) throw new Error(result.error);
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
    };
    await toast.promise(run(), {
      loading: "Eliminando profesor...",
      success: `Profesor ${teacher.name} eliminado`,
      error: (e: Error) => e.message,
    });
    setLoadingId(null);
  }

  return (
    <>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar profesor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará permanentemente la cuenta de <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-[380px_1fr] gap-6 items-start">
        {/* Create Teacher Form */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-mono uppercase tracking-wider text-foreground">Nuevo Profesor</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Nombre completo</Label>
                <Input id="name" name="name" type="text" required placeholder="María García" className="h-10 bg-background/50 border-border/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="m.garcia@centro.edu" className="h-10 bg-background/50 border-border/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Contraseña inicial</Label>
                <Input id="password" name="password" type="password" required placeholder="Mínimo 8 caracteres" className="h-10 bg-background/50 border-border/50" />
              </div>

              {createState?.error && (
                <p className="text-[11px] font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{createState.error}</p>
              )}

              <CreateButton />
            </form>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
              Profesores
              <Badge variant="outline" className="font-mono text-xs">{teachers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground font-mono text-center py-8">No hay profesores registrados.</p>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="border border-border/50 rounded-lg p-4 bg-muted/40">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{teacher.email}</p>
                        <div className="mt-1.5">
                          {teacher.banned ? (
                            <Badge variant="destructive" className="text-[10px] font-mono">BLOQUEADO</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono text-green-400 border-green-400/30">ACTIVO</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={loadingId === teacher.id}
                          onClick={() => {
                            setResetingId(resetingId === teacher.id ? null : teacher.id);
                            setNewPassword("");
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Resetear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={loadingId === teacher.id}
                          onClick={() => handleToggle(teacher)}
                        >
                          {teacher.banned ? <CheckCircle className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                          {teacher.banned ? "Activar" : "Bloquear"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={loadingId === teacher.id}
                          onClick={() => setDeleteTarget(teacher)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>

                    {/* Inline reset password form */}
                    {resetingId === teacher.id && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                        <Input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          type="password"
                          placeholder="Nueva contraseña (mín. 8 caracteres)"
                          className="h-8 text-xs bg-background/50 border-border/50 flex-1"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={loadingId === teacher.id}
                          onClick={() => handleReset(teacher)}
                        >
                          {loadingId === teacher.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setResetingId(null); setNewPassword(""); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
