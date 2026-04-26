"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "client",
    label: "PC nueva",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "client",
      label: "PC nueva",
      facts: [
        { label: "estado", value: "Aun no tiene IP" },
        { label: "udp", value: "Puerto 68" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor DHCP",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor DHCP",
      facts: [
        { label: "udp", value: "Puerto 67" },
        { label: "entrega", value: "IP, gateway y DNS" },
      ],
    },
  },
]

export function DhcpAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="DHCP ENTREGA LA CONFIGURACION DE RED"
      nodes={nodes}
      links={[{ from: "client", to: "server" }]}
      cards={[
        { id: "intro", x: 248, y: 52, width: 304, title: "EL EQUIPO ENTRA SIN IP CONFIGURADA", body: "Necesita pedir ayuda a la red", tone: "warn" },
        { id: "offer", x: 494, y: 288, width: 228, title: "EL SERVIDOR OFRECE UNA IP", body: "Tambien propone otros datos de red", tone: "active" },
        { id: "summary", x: 206, y: 360, width: 388, title: "DHCP ENTREGA IP, MASCARA, GATEWAY Y DNS", body: "Asi el equipo ya puede empezar a comunicarse", tone: "success" },
      ]}
      packets={[
        { id: "discover", label: "DISCOVER", tone: "primary", width: 90 },
        { id: "offer", label: "OFFER", tone: "tertiary", width: 74 },
        { id: "request", label: "REQUEST", tone: "primary", width: 86 },
        { id: "ack", label: "ACK", tone: "secondary", width: 58 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "client", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "discover", from: "client", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "client", tone: "active" }], showCards: ["offer"], motions: [{ packetId: "offer", from: "server", to: "client", duration: 0.72 }] },
        { id: "step-4", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "request", from: "client", to: "server", duration: 0.72 }] },
        { id: "step-5", highlights: [{ nodeId: "client", tone: "success" }, { nodeId: "server", tone: "success" }], showCards: ["summary"], motions: [{ packetId: "ack", from: "server", to: "client", duration: 0.72 }] },
      ]}
    />
  )
}
