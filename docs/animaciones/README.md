# Documentación de Animaciones Educativas

Bienvenido a la sección de documentación para crear y mantener animaciones educativas interactivas en aula-it.

## Índice

- **[COMO-CREAR-ANIMACIONES.md](./COMO-CREAR-ANIMACIONES.md)** — Guía completa paso a paso para crear nuevas animaciones. Comienza aquí.

## Resumen rápido

El sistema permite crear animaciones interactivas de conceptos de redes usando:

- **GSAP** para las animaciones de bajo nivel
- **Framer Motion** para la interfaz del reproductor
- **SVG** para la topología y visualización
- **React Context** para conectar componentes

## Flujo básico

1. Define los **pasos** en `lib/animations/registry.ts`
2. Registra la animación en el **registry**
3. Crea el **componente** con GSAP timeline
4. Añade a **animationMap** en `app/animations/[slug]/page.tsx`
5. Exporta desde **components/animations/index.ts**

## Estructura

```
lib/animations/
  └── registry.ts              ← Metadatos y pasos

components/animations/
  ├── animation-player.tsx     ← Reproductor genérico
  ├── xxx-animation.tsx        ← Tu animación
  └── index.ts                 ← Exports

app/animations/
  ├── layout.tsx               ← Auth-gated layout
  ├── page.tsx                 ← Índice
  └── [slug]/page.tsx          ← Página individual
```

## Ejemplo mínimo

Ver la sección **"Ejemplo completo mínimo"** en `COMO-CREAR-ANIMACIONES.md` para un ejemplo de "Hello World" completamente funcional.

## Preguntas frecuentes

**¿Cuántos pasos debe tener una animación?**
De 3 a 5 pasos es ideal. Algo más corto se siente incompleto, algo más largo puede ser tedioso.

**¿Puedo reutilizar código entre animaciones?**
Sí. Copia y adapta la estructura de `arp-animation.tsx`. Los colores `C` y posiciones `N` son constantes de diseño.

**¿Dónde debo pedir ayuda?**
Mira el código existente en `arp-animation.tsx`, la documentación de GSAP, y prueba localmente con `npm run dev`.

---

**Comienza con [COMO-CREAR-ANIMACIONES.md](./COMO-CREAR-ANIMACIONES.md)** — está diseñada para que cualquier desarrollador pueda crear una animación en 30 minutos.
