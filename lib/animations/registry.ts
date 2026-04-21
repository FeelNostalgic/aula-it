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

export const osiTcpIpSteps = [
  {
    id: "step-1",
    label: "1. Dos modelos para ordenar la comunicacion",
    description:
      "OSI y TCP/IP dividen la comunicacion de red en capas. La idea es la misma: separar responsabilidades para que cada nivel haga un trabajo concreto sin mezclarlo todo.",
  },
  {
    id: "step-2",
    label: "2. El modelo OSI organiza la red en 7 capas",
    description:
      "OSI separa con mucho detalle las funciones: aplicacion, presentacion, sesion, transporte, red, enlace y fisica. Es un modelo muy util para estudiar y diagnosticar.",
  },
  {
    id: "step-3",
    label: "3. TCP/IP agrupa esas funciones en 4 capas",
    description:
      "TCP/IP simplifica el enfoque en cuatro bloques: aplicacion, transporte, internet y acceso a la red. Es el modelo que describe mejor como funciona Internet en la practica.",
  },
  {
    id: "step-4",
    label: "4. Varias capas OSI se agrupan dentro de TCP/IP",
    description:
      "Aplicacion de TCP/IP absorbe aplicacion, presentacion y sesion de OSI. Acceso a la red agrupa enlace y fisica. Transporte e internet se corresponden de forma mas directa.",
  },
  {
    id: "step-5",
    label: "5. Los datos bajan por capas y se encapsulan",
    description:
      "Al enviar informacion, los datos descienden por la pila y cada capa anade su propia informacion. En recepcion ocurre lo contrario: cada capa elimina su cabecera y entrega el contenido a la superior.",
  },
  {
    id: "step-6",
    label: "6. Similitudes y diferencias clave",
    description:
      "Ambos modelos usan capas y modularidad. La diferencia grande es que OSI es mas teorico y detallado, mientras que TCP/IP es mas compacto y esta basado en protocolos reales usados en redes actuales.",
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
  {
    slug: "osi-tcp-ip",
    title: "Modelo OSI vs TCP/IP",
    description:
      "Compara las capas de OSI y TCP/IP, su correspondencia y el recorrido de los datos para entender en que se parecen y en que se diferencian.",
    topic: "Redes",
    steps: osiTcpIpSteps,
  },
]
