# Plan de Implementación: Aula IT Learning Dashboard

Este documento detalla los pasos para inicializar el proyecto **Aula IT** siguiendo las especificaciones del PRD y los estándares de ingeniería definidos (Next.js 15+, React 19, Tailwind 4, Supabase).

## 1. Inicialización y Configuración Base (Completado)
- **Scaffolding:** Ejecutar `npx create-next-app@latest .` con soporte para TypeScript, ESLint y App Router. (Hecho: Next.js 16.1+, React 19, Turbopack).
- **React 19 & Tailwind 4:** Asegurar que las dependencias estén actualizadas a React 19 y configurar Tailwind 4 (usando el nuevo motor CSS-first). (Hecho: @tailwindcss/postcss).
- **Fuentes:** Configurar **Geist Sans** y **JetBrains Mono** vía `next/font`. (Hecho).
- **Tokens de Diseño (CSS):** Implementar las variables de CSS en `globals.css` según el PRD (colores industriales, bordes brutalistas). (Hecho).
- **Estructura de Carpetas:** Seguir la convención del skill `nextjs-16`:
  - `app/(auth)/login/page.tsx` (Hecho)
  - `app/dashboard/page.tsx` (Hecho)
  - `app/_components/` para componentes compartidos. (Hecho: Button, Input, Card).

## 2. Configuración de Supabase (Completado)
- **Instalación:** `npm install @supabase/supabase-js @supabase/ssr`. (Hecho: Usando SSR de 2026).
- **Variables de Entorno:** Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (Hecho: Placeholders en .env.local).
- **Client SDK:** Crear un cliente de Supabase (Singleton/Hook) optimizado para React 19 y Server Actions. (Hecho en utils/supabase/).
- **Google Auth:** Configurar el proveedor de Google en la consola de Supabase (requerirá intervención manual para las claves de API). (Hecho: Callback /auth/callback/route.ts).

## 3. Capa de Autenticación y Middleware (Completado)
- **Middleware:** Implementar `proxy.ts` (Next.js 16) para proteger la ruta `/dashboard`. Redirigir a `/login` si no hay sesión activa. (Hecho).
- **Server Actions:** Crear acciones para login con email/password y logout. (Hecho en login/actions.ts).

## 4. Desarrollo de UI (Completado)
- **Componentes Base:** Crear `Button`, `Input`, `Card` con bordes de 1px (`#333333`), radios de 6-8px, y tipografía monospaciada para datos. (Hecho).
- **Pantalla de Login:**
  - Formulario de Email + Password (usando `useActionState` de React 19). (Hecho).
  - Botón de "Sign in with Google" con estética minimalista. (Hecho).
- **Pantalla de Dashboard:**
  - Layout con sidebar/header industrial. (Hecho en dashboard/layout.tsx).
  - Botón de Logout funcional. (Hecho en /auth/sign-out).
  - Placeholder central con rejilla (grid precision). (Hecho).

## 5. Verificación y Calidad (En Proceso)
- **Linting & Type Checking:** Ejecutar `npm run lint` y `tsc`. (Hecho: tsc passed).
- **Pruebas:** Verificar el flujo completo de auth (Login -> Dashboard -> Logout). Genera las pruebas con playwright. (Hecho: tests/auth.spec.ts).

---

### Notas Adicionales
> **Atención:** El texto de los diseños (`Pasted Text: 13 lines`) no se visualizó correctamente en mi sistema. ¿Podrías proporcionarme el contenido de esos textos o confirmar si prefieres que siga el estilo visual del PRD al pie de la letra para la estructura de la UI?

¿Deseas que proceda con este plan o quieres realizar algún ajuste?

Login screen:
## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project
Title: Prototipo 4 - Estilo Git
ID: 9985702053480769959

## Screens:
1. Login - IT Academy
    ID: 23cff0304efb44a0a4681156bf1fb520

Use a utility like `curl -L` to download the hosted URLs.

Dashboard screen:
## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project
Title: Prototipo 4 - Estilo Git
ID: 9985702053480769959

## Screens:
1. IT Academy - Dashboard Genérico
    ID: e43d6582e40f4c7bae20305d08be43e9

Use a utility like `curl -L` to download the hosted URLs.