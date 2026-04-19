import { listTeachers } from "../actions";
import { TeacherPanel } from "../teacher-panel";
import { Shield } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gestión de profesores",
};

export default async function AdminTeachersPage() {
  const { teachers, error } = await listTeachers();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestión de Profesores</h1>
          <p className="text-xs text-muted-foreground font-mono">Administración de cuentas de profesores</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded px-4 py-3">
          {error}
        </p>
      ) : (
        <TeacherPanel initialTeachers={teachers ?? []} />
      )}
    </div>
  );
}
