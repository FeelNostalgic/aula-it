import { Users } from "lucide-react";
import { getAdminStudents } from "./actions";
import { getAllModulesWithTeachers } from "../enrollment/actions";
import { AdminStudentsPanel } from "./admin-students-panel";

interface AdminStudentsPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function AdminStudentsPage({ searchParams }: AdminStudentsPageProps) {
  const { tab } = await searchParams;
  const initialTab = tab === "crear" ? "crear" : "alumnos";
  const [{ students, error }, { modules }] = await Promise.all([
    getAdminStudents(),
    getAllModulesWithTeachers(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestión de Alumnos</h1>
          <p className="text-xs text-muted-foreground font-mono">Creación de cuentas y gestión completa de alumnos</p>
        </div>
      </div>

      <AdminStudentsPanel
        initialStudents={students ?? []}
        fetchError={error}
        initialModules={modules ?? []}
        initialTab={initialTab}
      />
    </div>
  );
}
