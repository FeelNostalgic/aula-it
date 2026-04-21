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

export const ipBasicSteps = [
  {
    id: "step-1",
    label: "1. Un equipo quiere llegar a otro usando su IP",
    description:
      "PC A quiere enviar informacion a un equipo remoto. Lo importante a este nivel es conocer la IP origen y la IP destino, porque IP identifica a los extremos logicos de la comunicacion.",
  },
  {
    id: "step-2",
    label: "2. La IP origen y la IP destino viajan en el paquete",
    description:
      "El paquete IP indica quien envia y a quien va dirigido. Gracias a esas direcciones, la red puede distinguir claramente el emisor y el receptor final.",
  },
  {
    id: "step-3",
    label: "3. El paquete entra en la red IP",
    description:
      "PC A entrega el paquete a la red. Desde ese momento, la informacion clave para moverlo es la IP destino que aparece en su cabecera.",
  },
  {
    id: "step-4",
    label: "4. La red lo encamina hacia el destino correcto",
    description:
      "La red intermedia va guiando el paquete en la direccion adecuada. No necesita abrir los datos de aplicacion; le basta con la informacion de direccionamiento IP.",
  },
  {
    id: "step-5",
    label: "5. El paquete acaba en el host cuya IP coincide",
    description:
      "Cuando el paquete llega al equipo que tiene esa IP, la entrega logica se completa. IP resuelve precisamente eso: llevar el paquete hasta el destino correcto.",
  },
]

export const ipRouteSteps = [
  {
    id: "step-1",
    label: "1. Origen y destino estan en redes distintas",
    description:
      "PC A esta en una red local y el servidor B en otra diferente. Por eso no basta con quedarse dentro de la LAN: el paquete debe salir hacia otra red.",
  },
  {
    id: "step-2",
    label: "2. El paquete sale primero por la puerta de enlace",
    description:
      "Como el destino no esta en su misma red, PC A entrega el paquete a su gateway. Ese router es el primer punto de salida hacia el exterior.",
  },
  {
    id: "step-3",
    label: "3. La red intermedia busca el camino hacia la red remota",
    description:
      "Una vez fuera de la red origen, el paquete atraviesa la red intermedia. El objetivo ya no es una MAC concreta, sino alcanzar la red donde vive la IP destino.",
  },
  {
    id: "step-4",
    label: "4. El router de destino lo acerca a la red final",
    description:
      "El ultimo router reconoce que la red de destino esta conectada a el y reenvia el paquete hacia ese ultimo tramo.",
  },
  {
    id: "step-5",
    label: "5. El host final lo recibe dentro de su red",
    description:
      "Cuando el paquete entra en la red correcta, ya puede ser entregado al equipo final. IP organiza el recorrido logico entre redes diferentes.",
  },
]

export const ipHopByHopSteps = [
  {
    id: "step-1",
    label: "1. El paquete llega al primer router",
    description:
      "El equipo origen no cruza toda la ruta de golpe. Primero entrega el paquete al primer router, que sera quien tome la siguiente decision.",
  },
  {
    id: "step-2",
    label: "2. Router 1 decide el siguiente salto",
    description:
      "Router 1 consulta la red destino y decide a quien reenviar el paquete. No lo deja ahi: lo acerca al siguiente router del camino.",
  },
  {
    id: "step-3",
    label: "3. Router 2 vuelve a reenviar hacia delante",
    description:
      "El proceso se repite. Cada router usa el destino IP para mover el mismo paquete un paso mas cerca de la red final.",
  },
  {
    id: "step-4",
    label: "4. El ultimo router ya ve la red de destino",
    description:
      "Cuando el paquete alcanza un router conectado a la red correcta, ese router hace el ultimo reenvio hacia el host destino.",
  },
  {
    id: "step-5",
    label: "5. IP avanza salto a salto hasta llegar",
    description:
      "La idea clave es esta: IP no funciona como un salto magico de extremo a extremo. El paquete progresa hop by hop a traves de los routers.",
  },
]

export const ipEncapsulationSteps = [
  {
    id: "step-1",
    label: "1. Los datos se meten en un paquete IP",
    description:
      "La capa IP crea el paquete con su direccion origen y destino. Ese paquete sera la unidad logica que quiere llegar hasta el receptor final.",
  },
  {
    id: "step-2",
    label: "2. En el primer tramo viaja dentro de una trama de enlace",
    description:
      "Para cruzar el primer enlace fisico, el paquete IP necesita ir encapsulado dentro de una trama de capa inferior, por ejemplo Ethernet.",
  },
  {
    id: "step-3",
    label: "3. El router quita esa trama pero conserva el paquete IP",
    description:
      "Cuando el router recibe la trama, elimina el envoltorio del tramo anterior. Lo importante es que el paquete IP sigue siendo el mismo.",
  },
  {
    id: "step-4",
    label: "4. Para el siguiente tramo crea una nueva trama",
    description:
      "Ahora el router vuelve a encapsular ese mismo paquete IP en otra trama, adaptada al siguiente enlace. El exterior cambia; el interior IP no.",
  },
  {
    id: "step-5",
    label: "5. El proceso se repite hasta el destino",
    description:
      "Cada enlace puede usar una trama distinta. Lo que viaja de extremo a extremo es el paquete IP, mientras que la encapsulacion de enlace va cambiando.",
  },
  {
    id: "step-6",
    label: "6. El receptor recibe la ultima trama y extrae el paquete",
    description:
      "El equipo final desencapsula el ultimo tramo y recupera el paquete IP. Asi se ve la relacion real entre IP y las tecnologias de enlace.",
  },
]

export const icmpSteps = [
  {
    id: "step-1",
    label: "1. Queremos comprobar si el otro equipo responde",
    description:
      "ICMP se usa para mensajes de control y diagnostico. El ejemplo mas conocido es ping, que sirve para comprobar si hay comunicacion basica entre dos equipos.",
  },
  {
    id: "step-2",
    label: "2. Se envia un Echo Request",
    description:
      "El equipo origen manda un mensaje ICMP Echo Request. Eso es exactamente lo que genera un ping cuando empieza la prueba.",
  },
  {
    id: "step-3",
    label: "3. El destino recibe la peticion",
    description:
      "Si el mensaje llega correctamente al equipo remoto, este reconoce la solicitud ICMP y prepara una respuesta de vuelta.",
  },
  {
    id: "step-4",
    label: "4. Vuelve un Echo Reply",
    description:
      "El equipo destino responde con un Echo Reply. El origen recibe esa contestacion y sabe que hay retorno por la red.",
  },
  {
    id: "step-5",
    label: "5. Ping confirma conectividad basica",
    description:
      "Si hay Echo Request y Echo Reply, tenemos una comprobacion sencilla de comunicacion. ICMP puede hacer mas cosas, pero ping es el ejemplo mas claro para empezar.",
  },
]

export const tcpSteps = [
  {
    id: "step-1",
    label: "1. TCP necesita abrir una conexion",
    description:
      "TCP no empieza mandando datos sin mas. Primero establece una sesion entre cliente y servidor para preparar una comunicacion fiable.",
  },
  {
    id: "step-2",
    label: "2. Se realiza un handshake sencillo",
    description:
      "El ejemplo clasico es el intercambio SYN, SYN-ACK y ACK. Con eso ambos extremos quedan listos para empezar a intercambiar datos.",
  },
  {
    id: "step-3",
    label: "3. Los datos viajan en segmentos TCP",
    description:
      "Una vez abierta la conexion, TCP envia la informacion en segmentos. La idea importante aqui es que la comunicacion ya esta controlada y ordenada.",
  },
  {
    id: "step-4",
    label: "4. El receptor confirma lo que ha recibido",
    description:
      "TCP utiliza confirmaciones para saber si los datos llegaron. Eso ayuda a detectar perdidas y a mantener una entrega mas fiable.",
  },
  {
    id: "step-5",
    label: "5. TCP prioriza fiabilidad y control",
    description:
      "TCP es util cuando importa que los datos lleguen bien y en orden, aunque a cambio haya mas control y algo mas de sobrecarga.",
  },
]

export const udpSteps = [
  {
    id: "step-1",
    label: "1. UDP envia sin abrir conexion",
    description:
      "UDP no negocia una sesion previa. Si una aplicacion quiere mandar informacion, la encapsula y la envia directamente.",
  },
  {
    id: "step-2",
    label: "2. Los datagramas salen de forma ligera",
    description:
      "La comunicacion es mas simple y con menos pasos. Eso hace que UDP sea muy ligero comparado con TCP.",
  },
  {
    id: "step-3",
    label: "3. No hay confirmacion de recepcion",
    description:
      "UDP no usa ACK ni handshake. Si algo se pierde, el propio protocolo no se encarga de recuperarlo ni de avisar al emisor.",
  },
  {
    id: "step-4",
    label: "4. Si llega, el receptor lo procesa directamente",
    description:
      "Cuando un datagrama alcanza el destino, el receptor lo entrega a la aplicacion sin toda la maquinaria de control que usa TCP.",
  },
  {
    id: "step-5",
    label: "5. UDP prioriza rapidez y sencillez",
    description:
      "Por eso se usa en servicios donde interesa mas la inmediatez o la ligereza que la garantia absoluta de entrega.",
  },
]

export const tcpVsUdpSteps = [
  {
    id: "step-1",
    label: "1. TCP y UDP trabajan en transporte",
    description:
      "Ambos pertenecen a la capa de transporte, pero no resuelven la comunicacion del mismo modo. Aqui empieza la comparacion clave.",
  },
  {
    id: "step-2",
    label: "2. TCP abre conexion; UDP envia directo",
    description:
      "TCP necesita preparar una sesion antes de enviar datos. UDP, en cambio, manda directamente sin handshake previo.",
  },
  {
    id: "step-3",
    label: "3. TCP confirma; UDP no garantiza eso",
    description:
      "TCP usa confirmaciones y mas control de entrega. UDP no incorpora esos mecanismos y deja la comunicacion mucho mas ligera.",
  },
  {
    id: "step-4",
    label: "4. TCP controla mas; UDP pesa menos",
    description:
      "La diferencia practica es sencilla: TCP añade control y fiabilidad, mientras que UDP reduce pasos y sobrecarga.",
  },
  {
    id: "step-5",
    label: "5. Sus usos tipicos tambien son distintos",
    description:
      "TCP suele verse en web, correo o transferencia de archivos. UDP aparece mucho en DNS, voz, streaming o juegos en tiempo real.",
  },
  {
    id: "step-6",
    label: "6. Regla mental: fiabilidad frente a rapidez",
    description:
      "Si quieres una idea rapida: TCP cuando importa llegar bien; UDP cuando importa llegar rapido y con poca complejidad.",
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
  {
    slug: "ip-basico",
    title: "Protocolo IP: vision basica",
    description:
      "Introduce que hace IP a nivel general: identificar origen y destino logicos para que un paquete pueda acabar en el equipo correcto.",
    topic: "Redes",
    steps: ipBasicSteps,
  },
  {
    slug: "ip-ruta",
    title: "Protocolo IP: recorrido logico",
    description:
      "Muestra como un paquete IP sale de una red, cruza una red intermedia y alcanza una red remota gracias al direccionamiento logico.",
    topic: "Redes",
    steps: ipRouteSteps,
  },
  {
    slug: "ip-hop-by-hop",
    title: "Protocolo IP: salto a salto",
    description:
      "Explica que los routers no hacen magia de extremo a extremo: cada uno reenvia el paquete al siguiente salto hasta acercarlo al destino final.",
    topic: "Redes",
    steps: ipHopByHopSteps,
  },
  {
    slug: "ip-encapsulacion",
    title: "Protocolo IP: encapsulacion por tramo",
    description:
      "Visualiza como el mismo paquete IP se reencapsula en distintas tramas de enlace a medida que cruza cada tramo de la red.",
    topic: "Redes",
    steps: ipEncapsulationSteps,
  },
  {
    slug: "icmp",
    title: "Protocolo ICMP",
    description:
      "Presenta ICMP de forma sencilla usando ping para ver Echo Request, Echo Reply y la idea de comprobacion basica de conectividad.",
    topic: "Redes",
    steps: icmpSteps,
  },
  {
    slug: "tcp",
    title: "Protocolo TCP",
    description:
      "Resume como TCP establece conexion, envia datos con control y confirma la recepcion para ofrecer una comunicacion mas fiable.",
    topic: "Redes",
    steps: tcpSteps,
  },
  {
    slug: "udp",
    title: "Protocolo UDP",
    description:
      "Resume como UDP envia datagramas sin conexion previa ni confirmaciones, priorizando sencillez y rapidez.",
    topic: "Redes",
    steps: udpSteps,
  },
  {
    slug: "tcp-vs-udp",
    title: "TCP vs UDP",
    description:
      "Compara de forma visual y sencilla las diferencias clave entre TCP y UDP: conexion, fiabilidad, control y casos de uso mas habituales.",
    topic: "Redes",
    steps: tcpVsUdpSteps,
  },
]
