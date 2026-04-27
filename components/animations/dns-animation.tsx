"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "client",
    label: "Cliente",
    x: 118,
    y: 252,
    kind: "pc" as const,
    info: {
      id: "client",
      label: "Cliente",
      facts: [
        { label: "escribe", value: "www.ejemplo.com" },
        { label: "necesita", value: "La IP real" },
      ],
    },
  },
  {
    id: "dns",
    label: "Servidor DNS",
    x: 400,
    y: 290,
    kind: "server" as const,
    fontSize: 12.5,
    info: {
      id: "dns",
      label: "Servidor DNS",
      facts: [
        { label: "udp", value: "Puerto 53" },
        { label: "traduce", value: "Nombre a IP" },
      ],
    },
  },
  {
    id: "web",
    label: "Servidor web",
    x: 680,
    y: 130,
    kind: "server" as const,
    fontSize: 12.5,
    info: {
      id: "web",
      label: "Servidor web",
      facts: [
        { label: "espera", value: "La petición final" },
        { label: "usa", value: "La IP encontrada" },
      ],
    },
  },
]

export function DnsAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="DNS TRADUCE NOMBRES A DIRECCIONES IP"
      headlineY={122}
      nodes={nodes}
      links={[
        { from: "client", to: "dns" },
        { from: "client", to: "web" },
      ]}
      cards={[
        { id: "intro", x: 244, y: 52, width: 312, title: "DNS RESPONDE A LA PREGUNTA: QUE IP TIENE ESE NOMBRE", body: "Normalmente usa UDP 53", tone: "warn" },
        { id: "reply", x: 506, y: 244, width: 208, title: "RESPUESTA CON LA IP", body: "Ahora el cliente ya sabe a donde ir", tone: "active" },
        { id: "summary", x: 226, y: 390, width: 348, title: "DNS NO TRAE LA WEB: SOLO DICE QUE IP USAR", body: "Después ya se conecta al servidor correcto", tone: "success" },
      ]}
      packets={[
        { id: "query", label: "QUERY", tone: "primary", width: 78 },
        { id: "ip", label: "IP", tone: "secondary", width: 54 },
        { id: "web", label: "WEB", tone: "tertiary", width: 62 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "client", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "dns", tone: "active" }], motions: [{ packetId: "query", from: "client", to: "dns" }] },
        { id: "step-3", highlights: [{ nodeId: "client", tone: "success" }], showCards: ["reply"], motions: [{ packetId: "ip", from: "dns", to: "client", duration: 0.72 }] },
        { id: "step-4", highlights: [{ nodeId: "web", tone: "active" }], motions: [{ packetId: "web", from: "client", to: "web", duration: 0.84 }] },
        { id: "step-5", highlights: [{ nodeId: "client", tone: "success" }, { nodeId: "dns", tone: "success" }, { nodeId: "web", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
