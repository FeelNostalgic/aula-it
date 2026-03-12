import type { AnimationMeta } from "@/types/animations"

export const arpSteps = [
  {
    id: "step-1",
    label: "1. A quiere contactar a B",
    description:
      "PC A necesita enviar datos a PC B. Para ello, debe conocer su dirección MAC. Consulta su tabla ARP local… y no la encuentra. Debe preguntar a la red.",
  },
  {
    id: "step-2",
    label: "2. ARP Request — Broadcast",
    description:
      "A envía un ARP Request en broadcast (FF:FF:FF:FF:FF:FF). El mensaje dice: '¿Quién tiene la IP de B? Dime tu MAC.' Todos los equipos de la red lo reciben.",
  },
  {
    id: "step-3",
    label: "3. Solo B reconoce la petición",
    description:
      "Todos reciben el broadcast, pero solo PC B tiene esa IP. C lo ignora. B prepara una respuesta unicast directamente a A.",
  },
  {
    id: "step-4",
    label: "4. ARP Reply — Unicast de B a A",
    description:
      "B responde en unicast (solo a A): 'Yo tengo esa IP, mi MAC es B4:22:DA:FF:11:22.' A recibe la respuesta y ahora tiene la información que necesitaba.",
  },
  {
    id: "step-5",
    label: "5. A actualiza su tabla ARP",
    description:
      "A guarda en su tabla ARP la asociación IP→MAC de B. A partir de ahora puede comunicarse directamente con B a nivel de capa 2, sin volver a preguntar.",
  },
]

export const animationRegistry: AnimationMeta[] = [
  {
    slug: "arp",
    title: "Protocolo ARP",
    description:
      "Descubre cómo los equipos de red resuelven direcciones IP a direcciones MAC usando el protocolo ARP.",
    topic: "Redes",
    steps: arpSteps,
  },
]
