# Animation Style Guide

## Objetivo

Las animaciones de red deben representar el mismo tipo de objeto con el mismo icono, proporciones y jerarquia visual. El objetivo no es "parecer bonito"; es evitar inconsistencias visuales que confunden al alumno y degradan la lectura del sistema.

La fuente de verdad para iconos de dispositivos es:

- [network-device-icons.tsx](../components/animations/network-device-icons.tsx)

## Regla principal

No se dibujan PCs, switches ni routers directamente dentro de cada animacion con SVG inline ad hoc.

Siempre se reutilizan los glyphs compartidos:

- `PcGlyph`
- `SwitchGlyph`
- `RouterGlyph`

## Catalogo canonico

### PC

- Uso: hosts, clientes, equipos finales.
- Glyph: `PcGlyph`
- Radio del nodo: `36`
- Offset de etiqueta: `54`
- Pulso recomendado: `50`

### Switch

- Uso: conmutadores de capa 2.
- Glyph: `SwitchGlyph`
- Radio del nodo: `38`
- Offset de etiqueta: `56`

### Router

- Uso: routers o extremos punto a punto cuando se quiera remarcar encaminamiento o interfaces WAN.
- Glyph: `RouterGlyph`
- Radio del nodo: `40`
- Offset de etiqueta: `60`

## Reglas visuales

- El contenedor del nodo sigue siendo un `circle` exterior con clase `node-circle`.
- El glyph interior es monocromo y usa un unico `stroke` semantico.
- Las etiquetas de nodo usan `fontFamily="var(--font-mono)"`, `fontSize="13"` y `fontWeight="600"`.
- Los overlays, tarjetas, haces, paquetes y elementos ocultos deben llevar `pointerEvents="none"` si no son interactivos.
- El hover y los tooltips se asocian al nodo, no a decoraciones ni a overlays.

## Reglas de mantenimiento

- Si se introduce un nuevo tipo de dispositivo, primero se anade aqui y despues se reutiliza.
- Si cambia un glyph compartido, deben revisarse todas las animaciones que lo usan.
- Si una animacion necesita una variacion visual, se cambia el color o el estado del nodo, no la geometria base del icono.

## Animaciones migradas

- [arp-animation.tsx](../components/animations/arp-animation.tsx)
- [ethernet-animation.tsx](../components/animations/ethernet-animation.tsx)
- [ppp-animation.tsx](../components/animations/ppp-animation.tsx)
