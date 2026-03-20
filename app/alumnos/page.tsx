import { getClassroomStudents, getTeacherModules } from "./actions";
import { AlumnosClientPanel } from "./alumnos-client-panel";

export default async function GestionAlumnosPage() {
  const [{ students, error }, { modules }] = await Promise.all([
    getClassroomStudents(),
    getTeacherModules(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Alumnos</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Crea y gestiona cuentas anónimas para tu clase. Ningún dato real del alumno entra en el sistema.
        </p>
      </div>

      <AlumnosClientPanel
        initialStudents={students ?? []}
        fetchError={error}
        modules={modules ?? []}
      />
    </div>
  );
}
