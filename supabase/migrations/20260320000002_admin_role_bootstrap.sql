-- Ampliar el check constraint de profiles.role para incluir el rol 'admin'.
-- El constraint original solo permitía 'student' y 'teacher'.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'admin'));

COMMENT ON COLUMN public.profiles.role IS 'Roles válidos: student | teacher | admin';

-- Para promover el primer administrador del sistema, ejecutar desde el dashboard de Supabase:
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid-del-usuario>';
--
-- El usuario debe haberse registrado primero vía /login/teacher (email o Google).
-- Tras el UPDATE, el usuario verá el enlace "Panel de administración" en su menú
-- y podrá acceder a /admin para gestionar las cuentas de los profesores.
