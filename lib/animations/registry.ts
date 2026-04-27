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
    label: "1. Dos modelos para ordenar la comunicación",
    description:
      "OSI y TCP/IP dividen la comunicación de red en capas. La idea es la misma: separar responsabilidades para que cada nivel haga un trabajo concreto sin mezclarlo todo.",
  },
  {
    id: "step-2",
    label: "2. El modelo OSI organiza la red en 7 capas",
    description:
      "OSI separa con mucho detalle las funciones: aplicación, presentación, sesión, transporte, red, enlace y física. Es un modelo muy útil para estudiar y diagnosticar.",
  },
  {
    id: "step-3",
    label: "3. TCP/IP agrupa esas funciones en 4 capas",
    description:
      "TCP/IP simplifica el enfoque en cuatro bloques: aplicación, transporte, internet y acceso a la red. Es el modelo que describe mejor como funciona Internet en la práctica.",
  },
  {
    id: "step-4",
    label: "4. Varias capas OSI se agrupan dentro de TCP/IP",
    description:
      "Aplicación de TCP/IP absorbe aplicación, presentación y sesión de OSI. Acceso a la red agrupa enlace y física. Transporte e internet se corresponden de forma más directa.",
  },
  {
    id: "step-5",
    label: "5. Los datos bajan por capas y se encapsulan",
    description:
      "Al enviar información, los datos descienden por la pila y cada capa añade su propia información. En recepción ocurre lo contrario: cada capa elimina su cabecera y entrega el contenido a la superior.",
  },
  {
    id: "step-6",
    label: "6. Similitudes y diferencias clave",
    description:
      "Ambos modelos usan capas y modularidad. La diferencia grande es que OSI es más teórico y detallado, mientras que TCP/IP es más compacto y está basado en protocolos reales usados en redes actuales.",
  },
]

export const ethernetSteps = [
  {
    id: "step-1",
    label: "1. Un equipo quiere enviar datos en la LAN",
    description:
      "PC A necesita mandar información a PC B dentro de la red local. Ethernet resuelve como encapsular esos datos en una trama de capa 2 para enviarlos por la LAN.",
  },
  {
    id: "step-2",
    label: "2. Se construye una trama Ethernet",
    description:
      "La tarjeta de red crea una trama con MAC origen, MAC destino y EtherType. Esa trama será la unidad real que viaja por la red local.",
  },
  {
    id: "step-3",
    label: "3. La trama llega al switch",
    description:
      "El switch recibe la trama y lee la MAC destino. Su trabajo no es abrir los datos, sino decidir por qué puerto debe reenviarla.",
  },
  {
    id: "step-4",
    label: "4. El switch la envía solo al puerto correcto",
    description:
      "Como conoce la MAC de B en su tabla, envía la trama solo por ese puerto. Ethernet permite entrega local eficiente sin inundar toda la red en este caso.",
  },
  {
    id: "step-5",
    label: "5. El destino acepta la trama",
    description:
      "PC B comprueba que la MAC destino coincide con la suya y acepta la trama. Así Ethernet consigue la entrega local entre equipos de la misma LAN.",
  },
]

export const pppSteps = [
  {
    id: "step-1",
    label: "1. Dos equipos necesitan un enlace directo",
    description:
      "PPP se usa cuando hay una conexión punto a punto entre dos extremos. No hay switch en medio ni varios equipos compartiendo la misma LAN.",
  },
  {
    id: "step-2",
    label: "2. PPP establece el enlace",
    description:
      "Antes de enviar datos, los extremos negocian el enlace. Esta fase permite dejar preparada la comunicación entre ambos lados.",
  },
  {
    id: "step-3",
    label: "3. Los datos se encapsulan en una trama PPP",
    description:
      "PPP envuelve los datos en su propia trama, con campos de control y comprobación. Así define claramente que cruza el enlace punto a punto.",
  },
  {
    id: "step-4",
    label: "4. La trama cruza directamente al otro extremo",
    description:
      "Como solo hay dos extremos, la trama no necesita switch ni decisión por MAC destino. Va de un lado al otro por el mismo enlace.",
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
      "PC A quiere enviar información a un equipo remoto. Lo importante a este nivel es conocer la IP origen y la IP destino, porque IP identifica a los extremos lógicos de la comunicación.",
  },
  {
    id: "step-2",
    label: "2. La IP origen y la IP destino viajan en el paquete",
    description:
      "El paquete IP indica quién envía y a quién va dirigido. Gracias a esas direcciones, la red puede distinguir claramente el emisor y el receptor final.",
  },
  {
    id: "step-3",
    label: "3. El paquete entra en la red IP",
    description:
      "PC A entrega el paquete a la red. Desde ese momento, la información clave para moverlo es la IP destino que aparece en su cabecera.",
  },
  {
    id: "step-4",
    label: "4. La red lo encamina hacia el destino correcto",
    description:
      "La red intermedia va guiando el paquete en la dirección adecuada. No necesita abrir los datos de aplicación; le basta con la información de direccionamiento IP.",
  },
  {
    id: "step-5",
    label: "5. El paquete acaba en el host cuya IP coincide",
    description:
      "Cuando el paquete llega al equipo que tiene esa IP, la entrega lógica se completa. IP resuelve precisamente eso: llevar el paquete hasta el destino correcto.",
  },
]

export const ipRouteSteps = [
  {
    id: "step-1",
    label: "1. Origen y destino están en redes distintas",
    description:
      "PC A está en una red local y el servidor B en otra diferente. Por eso no basta con quedarse dentro de la LAN: el paquete debe salir hacia otra red.",
  },
  {
    id: "step-2",
    label: "2. El paquete sale primero por la puerta de enlace",
    description:
      "Como el destino no está en su misma red, PC A entrega el paquete a su gateway. Ese router es el primer punto de salida hacia el exterior.",
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
      "El último router reconoce que la red de destino está conectada a él y reenvía el paquete hacia ese último tramo.",
  },
  {
    id: "step-5",
    label: "5. El host final lo recibe dentro de su red",
    description:
      "Cuando el paquete entra en la red correcta, ya puede ser entregado al equipo final. IP organiza el recorrido lógico entre redes diferentes.",
  },
]

export const ipHopByHopSteps = [
  {
    id: "step-1",
    label: "1. El paquete llega al primer router",
    description:
      "El equipo origen no cruza toda la ruta de golpe. Primero entrega el paquete al primer router, que será quien tome la siguiente decisión.",
  },
  {
    id: "step-2",
    label: "2. Router 1 decide el siguiente salto",
    description:
      "Router 1 consulta la red destino y decide a quin reenviar el paquete. No lo deja ahí: lo acerca al siguiente router del camino.",
  },
  {
    id: "step-3",
    label: "3. Router 2 vuelve a reenviar hacia delante",
    description:
      "El proceso se repite. Cada router usa el destino IP para mover el mismo paquete un paso más cerca de la red final.",
  },
  {
    id: "step-4",
    label: "4. El último router ya ve la red de destino",
    description:
      "Cuando el paquete alcanza un router conectado a la red correcta, ese router hace el último reenvio hacia el host destino.",
  },
  {
    id: "step-5",
    label: "5. IP avanza salto a salto hasta llegar",
    description:
      "La idea clave es esta: IP no funciona como un salto mágico de extremo a extremo. El paquete progresa hop by hop a traves de los routers.",
  },
]

export const ipEncapsulationSteps = [
  {
    id: "step-1",
    label: "1. Los datos se meten en un paquete IP",
    description:
      "La capa IP crea el paquete con su dirección origen y destino. Ese paquete será la unidad lógica que quiere llegar hasta el receptor final.",
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
      "Cada enlace puede usar una trama distinta. Lo que viaja de extremo a extremo es el paquete IP, mientras que la encapsulación de enlace va cambiando.",
  },
  {
    id: "step-6",
    label: "6. El receptor recibe la ultima trama y extrae el paquete",
    description:
      "El equipo final desencapsula el último tramo y recupera el paquete IP. Así se ve la relación real entre IP y las tecnologías de enlace.",
  },
]

export const icmpSteps = [
  {
    id: "step-1",
    label: "1. Queremos comprobar si el otro equipo responde",
    description:
      "ICMP se usa para mensajes de control y diagnóstico. El ejemplo más conocido es ping, que sirve para comprobar si hay comunicación básica entre dos equipos.",
  },
  {
    id: "step-2",
    label: "2. Se envía un Echo Request",
    description:
      "El equipo origen manda un mensaje ICMP Echo Request. Eso es exactamente lo que genera un ping cuando empieza la prueba.",
  },
  {
    id: "step-3",
    label: "3. El destino recibe la petición",
    description:
      "Si el mensaje llega correctamente al equipo remoto, este reconoce la solicitud ICMP y prepara una respuesta de vuelta.",
  },
  {
    id: "step-4",
    label: "4. Vuelve un Echo Reply",
    description:
      "El equipo destino responde con un Echo Reply. El origen recibe esa contestación y sabe que hay retorno por la red.",
  },
  {
    id: "step-5",
    label: "5. Ping confirma conectividad básica",
    description:
      "Si hay Echo Request y Echo Reply, tenemos una comprobación sencilla de comunicación. ICMP puede hacer más cosas, pero ping es el ejemplo más claro para empezar.",
  },
]

export const tcpSteps = [
  {
    id: "step-1",
    label: "1. TCP necesita abrir una conexión",
    description:
      "TCP no empieza mandando datos sin más. Primero establece una sesión entre cliente y servidor para preparar una comunicación fiable.",
  },
  {
    id: "step-2",
    label: "2. Se realiza un handshake sencillo",
    description:
      "El ejemplo clásico es el intercambio SYN, SYN-ACK y ACK. Con eso ambos extremos quedan listos para empezar a intercambiar datos.",
  },
  {
    id: "step-3",
    label: "3. Los datos viajan en segmentos TCP",
    description:
      "Una vez abierta la conexión, TCP envía la información en segmentos. La idea importante aquí es que la comunicación ya está controlada y ordenada.",
  },
  {
    id: "step-4",
    label: "4. El receptor confirma lo que ha recibido",
    description:
      "TCP utiliza confirmaciones para saber si los datos llegaron. Eso ayuda a detectar pérdidas y a mantener una entrega más fiable.",
  },
  {
    id: "step-5",
    label: "5. TCP prioriza fiabilidad y control",
    description:
      "TCP es útil cuando importa que los datos lleguen bien y en orden, aunque a cambio haya más control y algo más de sobrecarga.",
  },
]

export const udpSteps = [
  {
    id: "step-1",
    label: "1. UDP envía sin abrir conexión",
    description:
      "UDP no negocia una sesión previa. Si una aplicación quiere mandar información, la encapsula y la envía directamente.",
  },
  {
    id: "step-2",
    label: "2. Los datagramás salen de forma ligera",
    description:
      "La comunicación es más simple y con menos pasos. Eso hace que UDP sea muy ligero comparado con TCP.",
  },
  {
    id: "step-3",
    label: "3. No hay confirmacion de recepción",
    description:
      "UDP no usa ACK ni handshake. Si algo se pierde, el propio protocolo no se encarga de recuperarlo ni de avisar al emisor.",
  },
  {
    id: "step-4",
    label: "4. Si llega, el receptor lo procesa directamente",
    description:
      "Cuando un datagrama alcanza el destino, el receptor lo entrega a la aplicación sin toda la maquinaria de control que usa TCP.",
  },
  {
    id: "step-5",
    label: "5. UDP prioriza rapidez y sencillez",
    description:
      "Por eso se usa en servicios donde interesa más la inmediatez o la ligereza que la garanta absoluta de entrega.",
  },
]

export const tcpVsUdpSteps = [
  {
    id: "step-1",
    label: "1. TCP y UDP trabajan en transporte",
    description:
      "Ambos pertenecen a la capa de transporte, pero no resuelven la comunicación del mismo modo. Aquí empieza la comparación clave.",
  },
  {
    id: "step-2",
    label: "2. TCP abre conexión; UDP envía directo",
    description:
      "TCP necesita preparar una sesión antes de enviar datos. UDP, en cambio, manda directamente sin handshake previo.",
  },
  {
    id: "step-3",
    label: "3. TCP confirma; UDP no garantiza eso",
    description:
      "TCP usa confirmaciones y más control de entrega. UDP no incorpora esos mecanismos y deja la comunicación mucho más ligera.",
  },
  {
    id: "step-4",
    label: "4. TCP controla mas; UDP pesa menos",
    description:
      "La diferencia práctica es sencilla: TCP añade control y fiabilidad, mientras que UDP reduce pasos y sobrecarga.",
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
      "Si quieres una idea rápida: TCP cuando importa llegar bien; UDP cuando importa llegar rápido y con poca complejidad.",
  },
]

export const ftpSteps = [
  {
    id: "step-1",
    label: "1. Un usuario quiere mover archivos",
    description:
      "FTP se usa para subir, bajar o listar archivos entre un cliente y un servidor. La idea base es sencilla: intercambiar ficheros entre dos extremos.",
  },
  {
    id: "step-2",
    label: "2. El cliente abre una sesión con el servidor",
    description:
      "El cliente contacta con el servidor FTP usando TCP, normalmente por el puerto 21. Primero hay que establecer la comunicación antes de transferir nada.",
  },
  {
    id: "step-3",
    label: "3. El usuario se identifica",
    description:
      "El cliente envía usuario y contrasena para acceder al contenido permitido. A partir de ahí puede empezar a pedir operaciones sobre archivos.",
  },
  {
    id: "step-4",
    label: "4. Se listan o transfieren archivos",
    description:
      "Una vez dentro, el cliente puede pedir un listado de carpetas, descargar un archivo o subir uno nuevo al servidor.",
  },
  {
    id: "step-5",
    label: "5. FTP sirve para ficheros, no para cifrar",
    description:
      "La idea importante es que FTP mueve archivos, pero de forma clasica no protege los datos con cifrado, por eso hoy suele evitarse en entornos modernos.",
  },
]

export const httpHttpsSteps = [
  {
    id: "step-1",
    label: "1. El navegador quiere abrir una web",
    description:
      "Cuando escribes una dirección en el navegador, este necesita pedir una pagina a un servidor web. Ahi entran HTTP y HTTPS.",
  },
  {
    id: "step-2",
    label: "2. HTTP envía una petición y espera respuesta",
    description:
      "HTTP funciona con el modelo peticion-respuesta. El cliente pide un recurso y el servidor devuelve la pagina o el contenido solicitado.",
  },
  {
    id: "step-3",
    label: "3. El servidor devuelve la pagina",
    description:
      "La respuesta puede incluir HTML, imágenes u otros recursos. Así se construye lo que ves luego en el navegador.",
  },
  {
    id: "step-4",
    label: "4. HTTPS añade una capa de seguridad",
    description:
      "HTTPS hace el mismo trabajo general que HTTP, pero protege la comunicación con cifrado para que los datos viajen mucho más seguros.",
  },
  {
    id: "step-5",
    label: "5. La web moderna usa HTTPS",
    description:
      "La idea clave es esta: HTTP sirve para la web, pero HTTPS protege mejor usuarios, contrasenas y contenido mientras viajan por la red.",
  },
]

export const smtpSteps = [
  {
    id: "step-1",
    label: "1. Un usuario redacta un correo",
    description:
      "Cuando escribes un email y pulsas enviar, tu equipo no lo lleva magicamente al destinatario. Primero se lo entrega a un servidor de correo.",
  },
  {
    id: "step-2",
    label: "2. El cliente entrega el mensaje al servidor SMTP",
    description:
      "SMTP se usa para enviar correo. El cliente conecta con el servidor SMTP, normalmente por TCP 25 o 587, y le pasa el mensaje.",
  },
  {
    id: "step-3",
    label: "3. El servidor lo reenvía hacia el destino",
    description:
      "El servidor SMTP no suele ser el final del camino. Muchas veces reenvía el correo hacia el servidor del dominio destinatario.",
  },
  {
    id: "step-4",
    label: "4. El mensaje queda en el buzon destino",
    description:
      "Cuando llega al servidor correcto, el correo queda guardado para el usuario destinatario. Ya está enviado, aunque todavia no se haya leido.",
  },
  {
    id: "step-5",
    label: "5. SMTP envía, no descarga correo",
    description:
      "Lo importante es no confundirlo: SMTP sirve para enviar mensajes de correo electronico, no para recuperarlos desde el buzon.",
  },
]

export const pop3Steps = [
  {
    id: "step-1",
    label: "1. El usuario quiere leer su correo",
    description:
      "Después de que el correo llegue al servidor, hace falta un protocolo para recogerlo y llevarlo al equipo del usuario.",
  },
  {
    id: "step-2",
    label: "2. El cliente conecta con el servidor POP3",
    description:
      "POP3 se usa para recoger correo desde el servidor. El cliente conecta normalmente por TCP 110 o 995 para empezar la consulta.",
  },
  {
    id: "step-3",
    label: "3. El usuario se identifica",
    description:
      "El cliente necesita autenticarse para demostrar que puede acceder a ese buzon y a los mensajes que contiene.",
  },
  {
    id: "step-4",
    label: "4. Los mensajes se descargan al equipo",
    description:
      "Una vez validado, el servidor envía los correos al cliente. Así los mensajes pasan del servidor al dispositivo del usuario.",
  },
  {
    id: "step-5",
    label: "5. POP3 está pensado para recoger correo",
    description:
      "La idea clave es simple: POP3 descarga el correo desde el servidor al cliente para que el usuario pueda leerlo en su equipo.",
  },
]

export const sshSteps = [
  {
    id: "step-1",
    label: "1. Un admin necesita entrar en un servidor remoto",
    description:
      "A veces hay que gestionar un equipo sin estar delante de el. SSH permite abrir una sesión remota para administrarlo.",
  },
  {
    id: "step-2",
    label: "2. El cliente abre la conexión SSH",
    description:
      "El administrador conecta con el servidor usando SSH, normalmente sobre TCP 22. Desde ahí se prepara la sesión remota.",
  },
  {
    id: "step-3",
    label: "3. El usuario se autentica",
    description:
      "Antes de aceptar comandos, el servidor comprueba que el usuario tiene permiso para acceder. Esa autenticacion forma parte del acceso seguro.",
  },
  {
    id: "step-4",
    label: "4. Se envian comandos y vuelven respuestas",
    description:
      "Una vez dentro, el cliente manda instrucciones y el servidor responde con resultados, como si el admin estuviera trabajando directamente alli.",
  },
  {
    id: "step-5",
    label: "5. SSH sirve para administrar con seguridad",
    description:
      "La idea importante es que SSH da acceso remoto y protege la comunicación con cifrado, algo clave al gestionar servidores.",
  },
]

export const dnsSteps = [
  {
    id: "step-1",
    label: "1. El usuario escribe un nombre",
    description:
      "Normalmente no recordamos IPs de memoria. Es más facil escribir un nombre como www.ejemplo.com y dejar que la red haga la traduccion.",
  },
  {
    id: "step-2",
    label: "2. El cliente pregunta al servidor DNS",
    description:
      "El equipo consulta al servidor DNS, normalmente por UDP 53, para averiguar que dirección IP corresponde a ese nombre.",
  },
  {
    id: "step-3",
    label: "3. DNS responde con la IP",
    description:
      "El servidor DNS no trae la web. Lo que hace es devolver la IP correcta para que el cliente sepa a que servidor debe conectarse.",
  },
  {
    id: "step-4",
    label: "4. Ahora ya se puede contactar con el servidor real",
    description:
      "Con la IP en la mano, el cliente puede iniciar la comunicación con el servidor web o con el servicio que buscaba.",
  },
  {
    id: "step-5",
    label: "5. DNS traduce nombres a direcciones",
    description:
      "Esa es la idea central: DNS no entrega la pagina, sino que convierte nombres faciles de recordar en IPs utiles para la red.",
  },
]

export const dhcpSteps = [
  {
    id: "step-1",
    label: "1. Un equipo nuevo entra en la red sin IP",
    description:
      "Cuando un equipo se conecta por primera vez, muchas veces no sabe que dirección usar. DHCP automatiza esa configuracion inicial.",
  },
  {
    id: "step-2",
    label: "2. El cliente busca un servidor DHCP",
    description:
      "El equipo lanza un mensaje Discover para localizar a un servidor DHCP que pueda darle una configuracion valida de red.",
  },
  {
    id: "step-3",
    label: "3. El servidor ofrece una IP disponible",
    description:
      "Si hay un servidor DHCP, responde con una oferta. Esa oferta puede incluir dirección IP, mascara, gateway y DNS.",
  },
  {
    id: "step-4",
    label: "4. El cliente pide quedarse con esa configuración",
    description:
      "Después de recibir la oferta, el cliente envía una solicitud para confirmar que quiere usar esa dirección y esos parámetros.",
  },
  {
    id: "step-5",
    label: "5. DHCP confirma y el equipo ya puede trabajar",
    description:
      "Cuando llega el ACK final, el equipo ya tiene configuracion de red y puede empezar a comunicarse sin poner esos datos a mano.",
  },
]

export const tftpSteps = [
  {
    id: "step-1",
    label: "1. Un cliente necesita un archivo simple desde la red",
    description:
      "TFTP se usa cuando importa la simplicidad: por ejemplo, para arrancar equipos por red o cargar imágenes y configuraciones sin toda la complejidad de otros protocolos.",
  },
  {
    id: "step-2",
    label: "2. El cliente pide el archivo al servidor TFTP",
    description:
      "El cliente enva una petición de lectura al servidor usando UDP. En TFTP no hay sesión pesada ni autenticación integrada: la idea es pedir un fichero y empezar rápido.",
  },
  {
    id: "step-3",
    label: "3. El servidor responde con el primer bloque de datos",
    description:
      "El archivo no viaja entero de golpe. TFTP lo divide en bloques pequeños y envía el primero para que el cliente pueda ir recibiendo y comprobando el avance.",
  },
  {
    id: "step-4",
    label: "4. El cliente confirma cada bloque con ACK",
    description:
      "Tras recibir un bloque, el cliente responde con un ACK. Ese intercambio bloque-ACK controla el orden de la transferencia sin convertir TFTP en un protocolo complejo.",
  },
  {
    id: "step-5",
    label: "5. El último bloque cierra la transferencia",
    description:
      "Cuando llega el último bloque y se confirma, la transferencia termina. TFTP resuelve una tarea concreta: mover archivos pequeños con la mínima complejidad posible.",
  },
]

export const csmaCdSteps = [
  {
    id: "step-1",
    label: "1. Varios equipos comparten el mismo medio",
    description:
      "En Ethernet antigua en half-duplex todos comparten el mismo canal. Antes de transmitir, una tarjeta escucha para comprobar si el medio está libre.",
  },
  {
    id: "step-2",
    label: "2. Dos equipos creen que pueden transmitir a la vez",
    description:
      "PC A y PC B escuchan, no detectan tráfico en ese instante y comienzan a transmitir casi al mismo tiempo. Ese es justo el escenario que provoca la colisión.",
  },
  {
    id: "step-3",
    label: "3. Las señales chocan y ambos detectan la colisión",
    description:
      "Las tramas se superponen en el medio compartido. Ninguna llega bien. Los equipos detectan que lo que estan viendo no coincide con lo que estaban enviando.",
  },
  {
    id: "step-4",
    label: "4. Se envía jam y cada equipo espera un tiempo aleatorio",
    description:
      "Tras detectar la colisión, se emite una senal de jam para que todos sepan que esa transmisión ha fallado. Después cada emisor espera un backoff aleatorio antes de reintentar.",
  },
  {
    id: "step-5",
    label: "5. Uno reintenta y ahora si transmite con exito",
    description:
      "Como los tiempos de espera ya no coinciden, uno de los equipos vuelve a intentarlo antes y consigue usar el medio sin chocar. Así CSMA/CD resuelve el acceso compartido por reintentos.",
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
    slug: "csma-cd",
    title: "CSMA/CD",
    description:
      "Explica como varios equipos comparten un mismo medio, que ocurre cuando colisionan y por que el backoff aleatorio permite reintentar sin quedarse bloqueados.",
    topic: "Redes",
    steps: csmaCdSteps,
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
    title: "Protocolo IP: vision básica",
    description:
      "Introduce que hace IP a nivel general: identificar origen y destino lógicos para que un paquete pueda acabar en el equipo correcto.",
    topic: "Redes",
    steps: ipBasicSteps,
  },
  {
    slug: "ip-ruta",
    title: "Protocolo IP: recorrido lógico",
    description:
      "Muestra como un paquete IP sale de una red, cruza una red intermedia y alcanza una red remota gracias al direccionamiento lógico.",
    topic: "Redes",
    steps: ipRouteSteps,
  },
  {
    slug: "ip-hop-by-hop",
    title: "Protocolo IP: salto a salto",
    description:
      "Explica que los routers no hacen magia de extremo a extremo: cada uno reenvía el paquete al siguiente salto hasta acercarlo al destino final.",
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
      "Presenta ICMP de forma sencilla usando ping para ver Echo Request, Echo Reply y la idea de comprobación básica de conectividad.",
    topic: "Redes",
    steps: icmpSteps,
  },
  {
    slug: "tcp",
    title: "Protocolo TCP",
    description:
      "Resume como TCP establece conexión, envía datos con control y confirma la recepción para ofrecer una comunicación más fiable.",
    topic: "Redes",
    steps: tcpSteps,
  },
  {
    slug: "udp",
    title: "Protocolo UDP",
    description:
      "Resume como UDP envía datagramás sin conexión previa ni confirmaciones, priorizando sencillez y rapidez.",
    topic: "Redes",
    steps: udpSteps,
  },
  {
    slug: "tcp-vs-udp",
    title: "TCP vs UDP",
    description:
      "Compara de forma visual y sencilla las diferencias clave entre TCP y UDP: conexión, fiabilidad, control y casos de uso más habituales.",
    topic: "Redes",
    steps: tcpVsUdpSteps,
  },
  {
    slug: "ftp",
    title: "Protocolo FTP",
    description:
      "Explica de forma sencilla como un cliente y un servidor intercambian archivos con FTP y por que no es una opcion segura por defecto.",
    topic: "Redes",
    steps: ftpSteps,
  },
  {
    slug: "http-https",
    title: "HTTP vs HTTPS",
    description:
      "Muestra como funciona la petición y respuesta web y que aporta HTTPS al anadir seguridad y cifrado frente a HTTP.",
    topic: "Redes",
    steps: httpHttpsSteps,
  },
  {
    slug: "tftp",
    title: "Protocolo TFTP",
    description:
      "Visualiza como TFTP transfiere archivos pequeños mediante bloques y ACK sobre UDP, priorizando simplicidad frente a funciones avanzadas.",
    topic: "Redes",
    steps: tftpSteps,
  },
  {
    slug: "smtp",
    title: "Protocolo SMTP",
    description:
      "Presenta SMTP como el protocolo que se usa para enviar correos desde el cliente al servidor y de servidor a servidor.",
    topic: "Redes",
    steps: smtpSteps,
  },
  {
    slug: "pop3",
    title: "Protocolo POP3",
    description:
      "Resume como POP3 permite al cliente recoger y descargar mensajes de correo almacenados en el servidor.",
    topic: "Redes",
    steps: pop3Steps,
  },
  {
    slug: "ssh",
    title: "Protocolo SSH",
    description:
      "Explica de forma visual como SSH da acceso remoto seguro para administrar un servidor mediante terminal.",
    topic: "Redes",
    steps: sshSteps,
  },
  {
    slug: "dns",
    title: "Protocolo DNS",
    description:
      "Visualiza la traducción de nombres a direcciones IP para entender por qué DNS es una pieza básica de la navegación y de Internet.",
    topic: "Redes",
    steps: dnsSteps,
  },
  {
    slug: "dhcp",
    title: "Protocolo DHCP",
    description:
      "Explica como un equipo obtiene automaticamente dirección IP y otros parametros basicos de red gracias a DHCP.",
    topic: "Redes",
    steps: dhcpSteps,
  },
]
