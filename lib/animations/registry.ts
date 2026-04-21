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

export const ethernetSteps = [
  {
    id: "step-1",
    label: "1. Un equipo quiere enviar datos en la LAN",
    description:
      "PC A necesita mandar informacion a PC B dentro de la red local. Ethernet resuelve como encapsular esos datos en una trama de capa 2 para enviarlos por la LAN.",
  },
  {
    id: "step-2",
    label: "2. Se construye una trama Ethernet",
    description:
      "La tarjeta de red crea una trama con MAC origen, MAC destino y EtherType. Esa trama sera la unidad real que viaja por la red local.",
  },
  {
    id: "step-3",
    label: "3. La trama llega al switch",
    description:
      "El switch recibe la trama y lee la MAC destino. Su trabajo no es abrir los datos, sino decidir por que puerto debe reenviarla.",
  },
  {
    id: "step-4",
    label: "4. El switch la reenvia solo al puerto correcto",
    description:
      "Como conoce la MAC de B en su tabla, envia la trama solo por ese puerto. Ethernet permite entrega local eficiente sin inundar toda la red en este caso.",
  },
  {
    id: "step-5",
    label: "5. El destino acepta la trama",
    description:
      "PC B comprueba que la MAC destino coincide con la suya y acepta la trama. Asi Ethernet consigue la entrega local entre equipos de la misma LAN.",
  },
]

export const pppSteps = [
  {
    id: "step-1",
    label: "1. Dos equipos necesitan un enlace directo",
    description:
      "PPP se usa cuando hay una conexion punto a punto entre dos extremos. No hay switch en medio ni varios equipos compartiendo la misma LAN.",
  },
  {
    id: "step-2",
    label: "2. PPP establece el enlace",
    description:
      "Antes de enviar datos, los extremos negocian el enlace. Esta fase permite dejar preparada la comunicacion entre ambos lados.",
  },
  {
    id: "step-3",
    label: "3. Los datos se encapsulan en una trama PPP",
    description:
      "PPP envuelve los datos en su propia trama, con campos de control y comprobacion. Asi define claramente que cruza el enlace punto a punto.",
  },
  {
    id: "step-4",
    label: "4. La trama cruza directamente al otro extremo",
    description:
      "Como solo hay dos extremos, la trama no necesita switch ni decision por MAC destino. Va de un lado al otro por el mismo enlace.",
  },
  {
    id: "step-5",
    label: "5. El receptor desencapsula y entrega los datos",
    description:
      "El equipo receptor elimina la cabecera PPP y entrega los datos a la capa superior. PPP resuelve el transporte ordenado de tramas en un enlace directo.",
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
  {
    slug: "ethernet",
    title: "Protocolo Ethernet",
    description:
      "Aprende como Ethernet encapsula datos en tramas y permite la entrega local dentro de una LAN mediante direcciones MAC y switches.",
    topic: "Redes",
    steps: ethernetSteps,
  },
  {
    slug: "ppp",
    title: "Protocolo PPP",
    description:
      "Entiende como PPP crea y mantiene un enlace punto a punto para encapsular y transportar datos entre dos extremos directos.",
    topic: "Redes",
    steps: pppSteps,
  },
]
