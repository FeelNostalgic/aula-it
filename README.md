# Aula IT

Plataforma educativa tipo dashboard para estudiantes de IT (SMR, ASIR, DAW, DAM). Interfaz inspirada en herramientas profesionales como Vercel, GitHub y Linear, con estética terminal/industrial.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth & DB**: Supabase
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Playwright (E2E)
- **Deploy**: Vercel (via CLI desde CI)
- **CI/CD**: GitHub Actions

## Desarrollo Local

```bash
npm install
npm run dev
```

La app se levanta en `http://localhost:3000`.

### Variables de entorno

Crea un `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Tests

```bash
npx playwright install chromium
npx playwright test
```

## CI/CD Pipeline

Cada push a `main` ejecuta este flujo:

```
push → Playwright Tests → Version Bump → Deploy a Vercel
```

- Si los tests **fallan**, no se despliega nada.
- Si los tests **pasan**, se bumpa la versión, se crea un tag y un GitHub Release, y se despliega a producción.

## Versionado (Conventional Commits)

La versión del proyecto se gestiona **automáticamente** mediante el pipeline. El tipo de bump depende del **prefijo del commit**:

| Prefijo | Bump | Ejemplo | Resultado |
|---|---|---|---|
| `fix:` | **patch** (0.1.0 → 0.1.1) | `fix: corregir validación de email` | Bug fix |
| `refactor:` | **patch** | `refactor: simplificar auth flow` | Refactor sin cambio externo |
| `style:` | **patch** | `style: ajustar espaciado sidebar` | Cambio visual |
| `docs:` | **patch** | `docs: actualizar README` | Documentación |
| `test:` | **patch** | `test: añadir test de registro` | Tests |
| `ci:` | **patch** | `ci: actualizar workflow` | Pipeline |
| `chore:` | **patch** | `chore: actualizar dependencias` | Mantenimiento |
| `perf:` | **patch** | `perf: optimizar carga de datos` | Performance |
| `build:` | **patch** | `build: actualizar next.config` | Build system |
| `skill:` | **patch** | `skill: actualizar/crear una skill` | Agent Skill |
| `feat:` | **minor** (0.1.0 → 0.2.0) | `feat: añadir filtro por temporada` | Feature nueva |
| `feat!:` | **major** (0.1.0 → 1.0.0) | `feat!: rediseño completo del dashboard` | Breaking change |

### Formato del commit

```
<tipo>[scope opcional]: <descripción>

[cuerpo opcional]

[footer opcional]
```

### Ejemplos

```bash
# Patch: bug fix
git commit -m "fix: corregir redirect en login con Google"

# Minor: nueva funcionalidad
git commit -m "feat: añadir página de perfil de usuario"

# Major: breaking change
git commit -m "feat!: migrar de REST a GraphQL"

# Con scope (contexto del cambio)
git commit -m "fix(auth): corregir expiración de sesión"

# Sin prefijo convencional → NO se bumpa versión (pero sí se despliega)
git commit -m "WIP: pruebas rápidas"
```

> **⚠️ Importante**: Los commits sin prefijo convencional sí ejecutan tests y despliegan, pero **no crean una nueva versión ni release**. Usa siempre prefijos para mantener un historial limpio.

## Versión

La versión actual se lee de `package.json` y se muestra en la UI automáticamente (login, registro, dashboard).