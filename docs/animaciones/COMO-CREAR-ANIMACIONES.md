# Cómo crear animaciones educativas en aula-it

## Introducción

Este sistema de animaciones permite crear visualizaciones interactivas de conceptos de redes e informática para estudiantes de primer curso de SMR. Cada animación es un timeline interactivo donde los estudiantes pueden:

- **Reproducir/pausar** la animación paso a paso
- **Navegar** entre pasos con botones o scrubber
- **Visualizar** topologías de red y flujo de datos en SVG
- **Comprender** cada paso mediante descripciones detalladas

El sistema combina **GSAP** (Green Sock Animation Platform) para las animaciones de bajo nivel y **Framer Motion** para la interfaz del reproductor.

---

## Estructura de archivos

```
aula-it/
├── types/
│   └── animations.ts                    ← Tipos base (AnimationStep, AnimationMeta)
├── lib/
│   └── animations/
│       └── registry.ts                  ← Registro central de metadatos y steps
├── components/
│   └── animations/
│       ├── animation-player.tsx         ← Reproductor genérico (Framer Motion UI)
│       ├── arp-animation.tsx            ← Ejemplo: animación ARP
│       └── index.ts                     ← Exports
├── app/
│   └── animations/
│       ├── layout.tsx                   ← Layout protegido por auth
│       ├── page.tsx                     ← Índice de animaciones
│       └── [slug]/
│           └── page.tsx                 ← Página individual de animación
└── docs/
    └── animaciones/
        └── COMO-CREAR-ANIMACIONES.md    ← Esta guía
```

---

## Paso a paso: crear una nueva animación

Vamos a crear una animación de ejemplo llamada **DNS** (resolución de nombres).

### Paso 1: Definir los pasos en `registry.ts`

Abre `lib/animations/registry.ts` y añade un array de pasos:

```typescript
// En lib/animations/registry.ts

export const dnsSteps = [
  {
    id: "step-1",
    label: "1. Cliente solicita IP de ejemplo.com",
    description:
      "El navegador del usuario necesita la dirección IP de ejemplo.com. Consulta la cache local... y no la encuentra. Debe preguntar al servidor DNS.",
  },
  {
    id: "step-2",
    label: "2. DNS Query: Cliente → Servidor DNS",
    description:
      "El cliente envía una consulta DNS (query) al servidor DNS recursivo (típicamente configurado en la red). Pregunta: '¿Cuál es la IP de ejemplo.com?'",
  },
  {
    id: "step-3",
    label: "3. Servidor DNS busca la respuesta",
    description:
      "El servidor DNS puede responder desde su cache, o debe buscar en otros servidores (root, TLD, autoritativo). En este caso, lo encuentra en cache.",
  },
  {
    id: "step-4",
    label: "4. DNS Response: Servidor DNS → Cliente",
    description:
      "El servidor DNS responde con la IP: 93.184.216.34. La respuesta va de vuelta al cliente.",
  },
  {
    id: "step-5",
    label: "5. Cliente actualiza su cache DNS",
    description:
      "El cliente recibe la IP y la guarda en su tabla DNS local. A partir de ahora, puede comunicarse directamente con el servidor sin volver a preguntar.",
  },
]
```

### Paso 2: Registrar la animación en `animationRegistry`

En el mismo archivo `lib/animations/registry.ts`, añade tu animación al array:

```typescript
export const animationRegistry: AnimationMeta[] = [
  {
    slug: "arp",
    title: "Protocolo ARP",
    description: "Descubre cómo los equipos de red resuelven direcciones IP a direcciones MAC usando el protocolo ARP.",
    topic: "Redes",
    steps: arpSteps,
  },
  // ← AÑADE AQUÍ
  {
    slug: "dns",
    title: "Resolución DNS",
    description: "Aprende cómo los navegadores resuelven nombres de dominio (ejemplo.com) a direcciones IP usando DNS.",
    topic: "Redes",
    steps: dnsSteps,
  },
]
```

**Importante:** El `slug` es el identificador único. Se usa en la URL: `/animations/dns`.

### Paso 3: Crear el componente de animación

Crea un archivo nuevo: `components/animations/dns-animation.tsx`

```typescript
"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useAnimationContext } from "./animation-player"

// Node positions in SVG space
const N = {
  client: { x: 140, y: 340 },
  dns: { x: 400, y: 100 },
  server: { x: 660, y: 340 },
}

// Colors
const C = {
  idle: "#464646",
  active: "#0070F3",
  success: "#10B981",
  warn: "#F59E0B",
  muted: "#191919",
  fg: "#EDEDED",
  bg: "#121212",
}

export function DnsAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    // ── Initial state ──────────────────────────────────────────────────
    gsap.set(q("#node-client"), { x: N.client.x, y: N.client.y })
    gsap.set(q("#node-dns"), { x: N.dns.x, y: N.dns.y })
    gsap.set(q("#node-server"), { x: N.server.x, y: N.server.y })

    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q(".packet"), { opacity: 0 })

    // ── Timeline ───────────────────────────────────────────────────────
    const tl = gsap.timeline({ paused: true })

    // STEP 1 — Cliente quiere resolver ejemplo.com
    tl.addLabel("step-1")
      .to(q("#node-client .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#question-mark"), { opacity: 1, y: -12, duration: 0.3 })

    // STEP 2 — DNS Query
    tl.addLabel("step-2")
      .to(q("#question-mark"), { opacity: 0, duration: 0.2 })
      .to(q("#node-client .node-circle"), { stroke: C.active, duration: 0.2 }, "<")
      .to(q("#pkt-query"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-query"), { x: N.dns.x, y: N.dns.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-query"), { opacity: 0, duration: 0.05 })
      .to(q("#node-dns .node-circle"), { stroke: C.active, strokeWidth: 2, duration: 0.3 }, "<")

    // STEP 3 — Servidor DNS busca
    tl.addLabel("step-3")
      .to(q("#node-dns .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 })
      .to(q("#search-indicator"), { opacity: 1, duration: 0.2 }, "<")

    // STEP 4 — DNS Response
    tl.addLabel("step-4")
      .to(q("#search-indicator"), { opacity: 0, duration: 0.2 })
      .to(q("#node-client .node-circle"), { stroke: C.idle, opacity: 0.5, duration: 0.2 })
      .to(q("#pkt-response"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-response"), { x: N.client.x, y: N.client.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-response"), { opacity: 0, duration: 0.1 })

    // STEP 5 — Cliente cachea la IP
    tl.addLabel("step-5")
      .to(q("#node-client .node-circle"), { stroke: C.success, strokeWidth: 3, opacity: 1, duration: 0.4 })
      .to(q("#dns-table"), { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)" })

    registerTimeline(tl)
    return () => { tl.kill() }
  }, [registerTimeline])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 460"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Static links */}
      <line
        x1={N.client.x}
        y1={N.client.y}
        x2={N.dns.x}
        y2={N.dns.y}
        stroke={C.idle}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1={N.dns.x}
        y1={N.dns.y}
        x2={N.server.x}
        y2={N.server.y}
        stroke={C.idle}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* Client Node */}
      <g id="node-client">
        <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
        <line x1="-6" y1="8" x2="6" y2="8" stroke={C.fg} strokeWidth="1.5" />
        <line x1="-12" y1="13" x2="12" y2="13" stroke={C.fg} strokeWidth="1.5" />
        <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
          Cliente
        </text>
        <text id="question-mark" x="28" y="-18" fill={C.warn} fontSize="24" fontWeight="900">
          ?
        </text>
        <g id="dns-table">
          <rect x="-10" y="-115" width="160" height="56" rx="6" fill={C.bg} stroke={C.success} strokeWidth="1.5" />
          <text x="0" y="-97" fontSize="9" fill={C.success} fontWeight="700" fontFamily="var(--font-mono)">
            CACHE DNS
          </text>
          <line x1="-2" y1="-90" x2="148" y2="-90" stroke={C.idle} strokeWidth="0.75" />
          <text x="0" y="-77" fontSize="8" fill={C.fg} fontFamily="var(--font-mono)">
            ejemplo.com → 93.184.216.34
          </text>
          <text x="0" y="-65" fontSize="8" fill="#737373" fontFamily="var(--font-mono)">
            TTL: 3600 segundos
          </text>
        </g>
      </g>

      {/* DNS Server Node */}
      <g id="node-dns">
        <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <rect x="-16" y="-9" width="32" height="18" rx="3" fill="none" stroke={C.active} strokeWidth="1.5" />
        <circle cx="-7" cy="0" r="2.5" fill={C.active} />
        <circle cx="0" cy="0" r="2.5" fill={C.active} />
        <circle cx="7" cy="0" r="2.5" fill={C.active} />
        <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
          Servidor DNS
        </text>
        <text id="search-indicator" x="28" y="-18" fill={C.warn} fontSize="20" fontWeight="900" opacity="0">
          ⚙
        </text>
      </g>

      {/* Web Server Node */}
      <g id="node-server">
        <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <rect x="-16" y="-10" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
        <line x1="-16" y1="5" x2="16" y2="5" stroke={C.fg} strokeWidth="1.5" />
        <line x1="-16" y1="10" x2="16" y2="10" stroke={C.fg} strokeWidth="1.5" />
        <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
          Web Server
        </text>
      </g>

      {/* Packets */}
      <g id="pkt-query" className="packet">
        <rect x="-35" y="-11" width="70" height="22" rx="5" fill={C.warn} />
        <text textAnchor="middle" y="4" fontSize="8.5" fill="#000" fontWeight="700" fontFamily="var(--font-mono)">
          DNS QUERY
        </text>
      </g>

      <g id="pkt-response" className="packet">
        <rect x="-40" y="-11" width="80" height="22" rx="5" fill={C.success} />
        <text textAnchor="middle" y="4" fontSize="8" fill="#fff" fontWeight="700" fontFamily="var(--font-mono)">
          DNS RESPONSE
        </text>
      </g>
    </svg>
  )
}
```

### Paso 4: Añadir al mapa de animaciones

Hay **tres sitios** donde debes registrar el componente:

**4a. Página standalone** — `app/animations/[slug]/page.tsx`:

```typescript
import { DnsAnimation } from "@/components/animations/dns-animation"

const animationMap = {
  arp: ArpAnimation,
  dns: DnsAnimation,  // ← AÑADE AQUÍ
} as const
```

**4b. Visor de actividades (alumno)** — `components/dashboard/activity-builder/viewers/step-viewer.tsx`:

```typescript
import { DnsAnimation } from "@/components/animations/dns-animation"

const animationMap: Record<string, React.ComponentType> = {
  arp: ArpAnimation,
  dns: DnsAnimation,  // ← AÑADE AQUÍ
}
```

**4c. Editor de actividades (preview del profesor)** — `components/dashboard/activity-builder/editors/animation-editor.tsx`:

```typescript
import { DnsAnimation } from "@/components/animations/dns-animation"

const previewMap: Record<string, React.ComponentType> = {
  arp: ArpAnimation,
  dns: DnsAnimation,  // ← AÑADE AQUÍ
}
```

### Paso 5: Exportar desde `index.ts`

En `components/animations/index.ts`, añade la exportación:

```typescript
export { AnimationPlayer } from "./animation-player"
export { ArpAnimation } from "./arp-animation"
export { DnsAnimation } from "./dns-animation"  // ← AÑADE AQUÍ
```

---

## SVG: dibujando la topología

Las animaciones usan SVG con viewBox fijo `0 0 800 460`. Todo se posiciona y anima con GSAP.

### Estructura básica de un nodo

Los nodos son grupos `<g id="node-X">` que GSAP posiciona en las coordenadas definidas en el objeto `N`:

```typescript
const N = {
  a: { x: 140, y: 340 },    // Coordenada de referencia en el SVG
  b: { x: 400, y: 340 },
  c: { x: 660, y: 340 },
}

// En useEffect:
gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })  // Posiciona el nodo
```

### Ejemplo: dibuja un nodo cliente

```tsx
<g id="node-client">
  {/* Círculo de fondo */}
  <circle
    className="node-circle"
    r="36"
    fill={C.bg}
    stroke={C.idle}
    strokeWidth="1.5"
  />

  {/* Monitor (icono simple) */}
  <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
  <line x1="-6" y1="8" x2="6" y2="8" stroke={C.fg} strokeWidth="1.5" />
  <line x1="-12" y1="13" x2="12" y2="13" stroke={C.fg} strokeWidth="1.5" />

  {/* Etiqueta */}
  <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
    Cliente
  </text>
</g>
```

### Ejemplo: dibuja un paquete

Los paquetes son elementos `<g id="pkt-X" className="packet">` que se animan entre nodos:

```tsx
<g id="pkt-query" className="packet">
  <rect x="-35" y="-11" width="70" height="22" rx="5" fill={C.warn} />
  <text textAnchor="middle" y="4" fontSize="8.5" fill="#000" fontWeight="700" fontFamily="var(--font-mono)">
    DNS QUERY
  </text>
</g>
```

**Regla importante:** Los paquetes comienzan con `opacity: 0` y se posicionan en su nodo origen:

```typescript
gsap.set(q("#pkt-query"), { opacity: 0 })
gsap.set(q("#pkt-query"), { x: N.client.x, y: N.client.y })
```

### Enlaces estáticos

Los enlaces son líneas estáticas entre nodos:

```tsx
<line
  x1={N.client.x}
  y1={N.client.y}
  x2={N.dns.x}
  y2={N.dns.y}
  stroke={C.idle}
  strokeWidth="1.5"
  strokeDasharray="4 3"  // Punteado
/>
```

---

## GSAP: construyendo el timeline

El timeline es una secuencia de tweens (animaciones) controladas por pasos. Cada paso corresponde a un label en el timeline.

### Estructura general

```typescript
const tl = gsap.timeline({ paused: true })  // Siempre paused: true

// STEP 1
tl.addLabel("step-1")
  .to(q("#node-a .node-circle"), { stroke: C.warn, duration: 0.3 })
  // más tweens del paso 1...

// STEP 2
tl.addLabel("step-2")
  .to(q("#node-b"), { opacity: 0.5, duration: 0.2 })
  // más tweens del paso 2...

registerTimeline(tl)
```

**Regla crítica:** El nombre del label DEBE ser `step-N` donde N es el número del paso (1, 2, 3, 4, 5). El reproductor extrae estos labels automáticamente.

### Tweens comunes

#### Cambiar color (stroke)

```typescript
.to(q("#node-a .node-circle"), { stroke: C.active, duration: 0.3 })
```

#### Mover un elemento

```typescript
.to(q("#pkt-query"), { x: N.dns.x, y: N.dns.y, duration: 0.7, ease: "power2.inOut" })
```

#### Cambiar opacidad

```typescript
.to(q("#pkt-query"), { opacity: 1, duration: 0.05 })  // Aparece
.to(q("#pkt-query"), { opacity: 0, duration: 0.05 })  // Desaparece
```

#### Ancho de línea (strokeWidth)

```typescript
.to(q("#node-a .node-circle"), { strokeWidth: 2.5, duration: 0.3 })
```

#### Escala con pulso (ring effect)

```typescript
.to(q("#node-a .ring"), {
  scale: 1.6,
  opacity: 0.5,
  repeat: 2,
  yoyo: true,
  ease: "power1.inOut",
  duration: 0.45,
  transformOrigin: "50% 50%",
})
```

### Timing en el timeline

#### Tweens secuenciales (uno después de otro)

```typescript
.to(q("#node-a"), { opacity: 1, duration: 0.3 })
.to(q("#node-b"), { opacity: 1, duration: 0.3 })  // Comienza después de que termina el anterior
```

#### Tweens simultáneos (al mismo tiempo)

Usa `"<"` como posición:

```typescript
.to(q("#node-a"), { opacity: 0.5, duration: 0.3 })
.to(q("#node-b"), { stroke: C.active, duration: 0.3 }, "<")  // Comienza cuando comienza el anterior
```

#### Tweens con delay relativo

Usa `"<0.2"` para un delay de 0.2 segundos desde el inicio del tween anterior:

```typescript
.to(q("#node-a"), { opacity: 0.5, duration: 0.3 })
.to(q("#node-b"), { stroke: C.active, duration: 0.3 }, "<0.2")  // Comienza 0.2s después del inicio del anterior
```

### Selectores CSS avanzados

GSAP con `gsap.utils.selector` soporta selectores CSS normales:

```typescript
const q = gsap.utils.selector(svgRef)

// Selector simple
q("#node-a")

// Clase
q(".packet")

// Múltiples targets (comma-separated)
q("#pkt-req, #pkt-bc-b, #pkt-bc-c")

// Descendientes
q("#node-a .node-circle")

// Múltiples clases
q(".node-circle.active")
```

---

## Colores y estilos

Siempre usa las constantes `C` para consistencia visual:

```typescript
const C = {
  idle: "#464646",        // Gris neutro (sin actividad)
  active: "#0070F3",      // Azul (activo/transmitiendo)
  success: "#10B981",     // Verde (éxito/completado)
  warn: "#F59E0B",        // Ámbar (advertencia/broadcast)
  muted: "#191919",       // Gris oscuro (desactivado/opaco)
  fg: "#EDEDED",          // Foreground (texto, iconos)
  bg: "#121212",          // Background (fondo de nodos)
}
```

**Cuándo usar cada color:**

- **idle**: Estado normal, sin actividad
- **active**: Equipo activo, transmitiendo, esperando
- **success**: Proceso completado, respuesta válida
- **warn**: Broadcast, advertencia, operación en curso
- **fg/bg**: Siempre para texto/iconos

---

## Reglas y gotchas

### 1. Labels DEBEN ser `step-N`

```typescript
// ✅ CORRECTO
tl.addLabel("step-1")
tl.addLabel("step-2")

// ❌ INCORRECTO
tl.addLabel("intro")
tl.addLabel("step")
```

El reproductor espera exactamente este patrón.

### 2. Timeline SIEMPRE `paused: true`

```typescript
// ✅ CORRECTO
const tl = gsap.timeline({ paused: true })

// ❌ INCORRECTO
const tl = gsap.timeline()  // Por defecto comienza a reproducirse
```

### 3. Cleanup en useEffect

```typescript
return () => { tl.kill() }  // Matar el timeline al desmontar
```

Si no lo haces, los tweens seguirán en memoria.

### 4. useAnimationContext dentro de "use client"

```typescript
"use client"  // ← OBLIGATORIO

export function MyAnimation() {
  const { registerTimeline } = useAnimationContext()
  // ...
}
```

Sin "use client", no puedes usar hooks.

### 5. Selector debe estar scoped al SVG

```typescript
// ✅ CORRECTO
const q = gsap.utils.selector(svgRef)  // Solo busca dentro del SVG

// ❌ PROBLEMÁTICO (aunque técnicamente funciona)
gsap.to("#node-a", { /* ... */ })  // Busca en todo el DOM
```

### 6. Paquetes: siempre empiezan ocultos

```typescript
// En initial state:
gsap.set(q(".packet"), { opacity: 0 })
gsap.set(q("#pkt-X"), { x: N.source.x, y: N.source.y })

// En timeline:
.to(q("#pkt-X"), { opacity: 1, duration: 0.05 })  // Aparece
.to(q("#pkt-X"), { x: N.dest.x, y: N.dest.y, duration: 0.7 })  // Se mueve
.to(q("#pkt-X"), { opacity: 0, duration: 0.05 })  // Desaparece
```

### 7. ViewBox fijo

```tsx
<svg viewBox="0 0 800 460" className="w-full h-full">
  {/* Siempre estos números */}
</svg>
```

---

## Ejemplo completo mínimo

Aquí está el ejemplo más simple posible: **dos nodos con un paquete entre ellos**.

Archivo: `components/animations/hello-animation.tsx`

```typescript
"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useAnimationContext } from "./animation-player"

const N = {
  a: { x: 200, y: 230 },
  b: { x: 600, y: 230 },
}

const C = {
  idle: "#464646",
  active: "#0070F3",
  success: "#10B981",
  warn: "#F59E0B",
  muted: "#191919",
  fg: "#EDEDED",
  bg: "#121212",
}

export function HelloAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    // Initial state
    gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#node-b"), { x: N.b.x, y: N.b.y })
    gsap.set(q(".packet"), { opacity: 0, x: N.a.x, y: N.a.y })

    // Timeline
    const tl = gsap.timeline({ paused: true })

    // STEP 1: A se activa
    tl.addLabel("step-1")
      .to(q("#node-a .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.4 })

    // STEP 2: A envía paquete a B
    tl.addLabel("step-2")
      .to(q("#pkt"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt"), { x: N.b.x, y: N.b.y, duration: 0.8, ease: "power2.inOut" })
      .to(q("#pkt"), { opacity: 0, duration: 0.05 })

    // STEP 3: B recibe y completa
    tl.addLabel("step-3")
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 2.5, duration: 0.4 }, "<0.1")
      .to(q("#node-a .node-circle"), { stroke: C.success, duration: 0.3 }, "<")

    registerTimeline(tl)
    return () => { tl.kill() }
  }, [registerTimeline])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 460"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Link */}
      <line
        x1={N.a.x}
        y1={N.a.y}
        x2={N.b.x}
        y2={N.b.y}
        stroke={C.idle}
        strokeWidth="2"
        strokeDasharray="4 3"
      />

      {/* Node A */}
      <g id="node-a">
        <circle className="node-circle" r="40" fill={C.bg} stroke={C.idle} strokeWidth="2" />
        <text y="60" textAnchor="middle" fill={C.fg} fontSize="14" fontWeight="600">
          Nodo A
        </text>
      </g>

      {/* Node B */}
      <g id="node-b">
        <circle className="node-circle" r="40" fill={C.bg} stroke={C.idle} strokeWidth="2" />
        <text y="60" textAnchor="middle" fill={C.fg} fontSize="14" fontWeight="600">
          Nodo B
        </text>
      </g>

      {/* Packet */}
      <g id="pkt" className="packet">
        <rect x="-25" y="-10" width="50" height="20" rx="4" fill={C.warn} />
        <text textAnchor="middle" y="5" fontSize="9" fill="#000" fontWeight="700">
          DATA
        </text>
      </g>
    </svg>
  )
}
```

Registro en `lib/animations/registry.ts`:

```typescript
export const helloSteps = [
  {
    id: "step-1",
    label: "1. Nodo A se activa",
    description: "El nodo A está listo para enviar datos.",
  },
  {
    id: "step-2",
    label: "2. A envía paquete a B",
    description: "Se transmite un paquete de datos desde A hacia B.",
  },
  {
    id: "step-3",
    label: "3. B recibe el paquete",
    description: "B recibe el paquete correctamente. Comunicación completada.",
  },
]

export const animationRegistry: AnimationMeta[] = [
  // ...otros...
  {
    slug: "hello",
    title: "Comunicación Simple",
    description: "El ejemplo más simple: dos nodos intercambiando un paquete.",
    topic: "Redes",
    steps: helloSteps,
  },
]
```

Importa y añade a `app/animations/[slug]/page.tsx`:

```typescript
import { HelloAnimation } from "@/components/animations/hello-animation"

const animationMap = {
  arp: ArpAnimation,
  dns: DnsAnimation,
  hello: HelloAnimation,  // ← AQUÍ
} as const
```

Exporta en `components/animations/index.ts`:

```typescript
export { HelloAnimation } from "./hello-animation"
```

---

## Referencia rápida: GSAP tweens comunes

| Propiedad | Rango | Ejemplo | Caso de uso |
|-----------|-------|---------|------------|
| `opacity` | 0-1 | `{ opacity: 0.5 }` | Mostrar/ocultar, desvanecerse |
| `x`, `y` | números | `{ x: 400, y: 300 }` | Mover elemento |
| `stroke` | color hex | `{ stroke: "#0070F3" }` | Cambiar color de borde |
| `strokeWidth` | números | `{ strokeWidth: 3 }` | Grosor de línea |
| `scale` | números | `{ scale: 1.5 }` | Zoom |
| `rotation` | grados | `{ rotation: 45 }` | Girar |
| `fill` | color hex | `{ fill: "#10B981" }` | Relleno |
| `duration` | segundos | `{ duration: 0.5 }` | Duración |
| `ease` | nombre | `{ ease: "power2.inOut" }` | Suavizado (power1/2/3, back, elastic, etc.) |
| `delay` | segundos | `{ delay: 0.2 }` | Retardo inicial |
| `repeat` | número | `{ repeat: 2 }` | Repeticiones (-1 = infinito) |
| `yoyo` | boolean | `{ yoyo: true }` | Invertir dirección en repeat |

Eases comunes:
- `"linear"` — sin suavizado
- `"power1.inOut"`, `"power2.inOut"`, `"power3.inOut"` — las más usadas
- `"back.out(1.5)"` — efecto de rebote
- `"elastic.out(1, 0.3)"` — efecto elástico

---

## Checklist antes de entregar

Antes de considerar tu animación completada, verifica:

- [ ] **Array de pasos en `registry.ts`:** 3-5 pasos bien descritos
- [ ] **AnimationMeta en `animationRegistry`:** Slug único, título, descripción, topic
- [ ] **Archivo del componente:** Nombre sigue patrón `xxx-animation.tsx`
- [ ] **useAnimationContext importado:** `import { useAnimationContext } from "./animation-player"`
- [ ] **Componente es "use client":** `"use client"` al principio del archivo
- [ ] **Timeline con paused: true:** `gsap.timeline({ paused: true })`
- [ ] **Labels correctos:** `step-1`, `step-2`, `step-3`, etc. (exactamente)
- [ ] **registerTimeline llamado:** `registerTimeline(tl)` en useEffect
- [ ] **Cleanup del timeline:** `return () => { tl.kill() }` en useEffect
- [ ] **SVG con viewBox correcto:** `viewBox="0 0 800 460"`
- [ ] **Nodos posicionados:** `gsap.set(q("#node-X"), { x: N.x.x, y: N.x.y })`
- [ ] **Paquetes inicialmente ocultos:** `gsap.set(q(".packet"), { opacity: 0 })`
- [ ] **Colores constantes:** Usa objeto `C` siempre
- [ ] **Selectores scoped:** `const q = gsap.utils.selector(svgRef)`
- [ ] **Importado en `[slug]/page.tsx`:** En `animationMap`
- [ ] **Importado en `step-viewer.tsx`:** En `animationMap` del visor de actividades
- [ ] **Importado en `animation-editor.tsx`:** En `previewMap` del editor
- [ ] **Exportado en `index.ts`:** En `components/animations/index.ts`
- [ ] **Probado en el navegador:** Abre `/animations/tu-slug` y reproduce
- [ ] **Todos los pasos funcionan:** Play, prev, next, scrubber, dots
- [ ] **Descripción visible:** El texto de cada paso es claro en el reproductor
- [ ] **Hover funciona (si aplica):** Las tarjetas de info aparecen y desaparecen sin flickering

---

## Preguntas frecuentes

### ¿Cómo pruebo mi animación localmente?

```bash
npm run dev
# Abre http://localhost:3000/animations/tu-slug
```

Si ves 404, verifica que:
1. El `slug` en `registry.ts` existe
2. El componente está en `animationMap` en `[slug]/page.tsx`
3. El componente está exportado en `components/animations/index.ts`

### ¿Puedo usar más de 5 pasos?

Sí. El reproductor soporta cualquier número de pasos. Solo asegúrate de que los labels van desde `step-1` hasta `step-N`.

### ¿Cómo añado tooltips/información en hover sobre nodos?

El sistema soporta tarjetas de información al hacer hover sobre nodos SVG. Usa el componente `NodeInfoCard`:

```typescript
import { NodeInfoCard } from "./node-info-card"
import type { NodeInfo } from "./node-info-card"

// Define la info de cada nodo
const NODE_INFO: Record<string, NodeInfo> = {
  a: {
    label: "PC A",
    ip: "192.168.1.10",
    mac: "AA:BB:CC:DD:EE:01",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
  },
  sw: {
    label: "Switch",
    macTable: [
      { port: "Fa0/1", mac: "AA:BB:CC:DD:EE:01" },
      { port: "Fa0/2", mac: "AA:BB:CC:DD:EE:02" },
    ],
  },
}

// Estado en el componente
const [selectedNode, setSelectedNode] = useState<string | null>(null)
const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

const cancelHide = () => {
  if (hideTimer.current) clearTimeout(hideTimer.current)
}
const scheduleHide = () => {
  hideTimer.current = setTimeout(() => setSelectedNode(null), 180)
}
```

En el SVG, añade handlers al grupo del nodo:

```tsx
<g
  id="node-a"
  onMouseEnter={() => { cancelHide(); setSelectedNode("a") }}
  onMouseLeave={scheduleHide}
  style={{ cursor: "pointer" }}
>
  {/* ... contenido del nodo ... */}
</g>
```

Renderiza la tarjeta fuera del SVG (en el contenedor padre):

```tsx
<div className="relative">
  <svg ref={svgRef} viewBox="0 0 800 460" className="w-full h-full">
    {/* ... */}
  </svg>

  {selectedNode && NODE_INFO[selectedNode] && (
    <NodeInfoCard
      node={NODE_INFO[selectedNode]}
      svgX={N[selectedNode].x}
      svgY={N[selectedNode].y}
      viewBoxW={800}
      viewBoxH={460}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    />
  )}
</div>
```

`NodeInfoCard` soporta: `ip`, `mac`, `mask`, `gateway`, `arpTable`, `macTable`. La tarjeta se auto-posiciona y hace flip si está demasiado cerca del borde del canvas.

### ¿Por qué mi paquete aparece en el lugar equivocado?

Verifica que:
1. Las posiciones iniciales en `gsap.set(q("#pkt-X"), { x, y })` coinciden con el nodo origen
2. El `transformOrigin` está centrali: todos los paquetes usan un rect centrado en (0, 0) localmente
3. GSAP posiciona el grupo, no el rect interno

### ¿Qué pasa si me olvido de `registerTimeline(tl)`?

El reproductor no tendrá timeline y los botones no funcionarán. Verás errores en la consola.

### ¿Puedo animar dentro de un node?

Sí, siempre que el SVG esté bien estructurado. Ejemplo:

```tsx
<g id="node-a">
  <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} />
  <g id="icon">
    {/* icono aquí */}
  </g>
</g>

// En timeline:
.to(q("#node-a #icon"), { rotation: 360, duration: 1 })
```

### ¿Cómo hago que el timeline dure más tiempo?

Aumenta la duración de los tweens o añade delays:

```typescript
.to(..., { duration: 2 })  // 2 segundos en lugar de 0.5
.to(..., { delay: 0.5 })   // Espera 0.5 segundos antes de empezar
```

---

## Recursos

- [GSAP Docs](https://gsap.com/docs/) — la referencia completa
- [GSAP Eases](https://gsap.com/docs/v3/Eases) — todos los eases disponibles
- [SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG) — si necesitas ayuda con SVG
- **Código existente:** Mira `arp-animation.tsx` como referencia completa

---

**¡Listo para crear tu animación? Comienza por copiar el ejemplo "Hello World" y adáptalo a tu concepto.**
