import { BookOpen } from "lucide-react";
import { getAllModulesWithTeachers, getAllTeachers } from "./actions";
import { getAdminStudents } from "../students/actions";
import { AdminEnrollmentPanel } from "./admin-enrollment-panel";

export default async function AdminEnrollmentPage() {
  const [{ modules, error: modulesError }, { teachers }, { students }] = await Promise.all([
    getAllModulesWithTeachers(),
    getAllTeachers(),
    getAdminStudents(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Matriculación</h1>
          <p className="text-xs text-muted-foreground font-mono">Gestión masiva de matrículas en todos los módulos</p>
        </div>
      </div>

      {modulesError ? (
        <p className="text-sm font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded px-4 py-3">
          {modulesError}
        </p>
      ) : (
        <AdminEnrollmentPanel
          modules={modules ?? []}
          teachers={teachers ?? []}
          students={students ?? []}
        />
      )}
    </div>
  );
}
