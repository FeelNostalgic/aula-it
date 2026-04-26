"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "client",
    label: "Cliente correo",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "client",
      label: "Cliente correo",
      facts: [
        { label: "tcp", value: "110 o 995" },
        { label: "lee", value: "Descarga mensajes" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor POP3",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor POP3",
      facts: [
        { label: "guarda", value: "Correo en el buzon" },
        { label: "entrega", value: "Mensajes al cliente" },
      ],
    },
  },
]

export function Pop3Animation() {
  return (
    <ApplicationProtocolAnimation
      headline="POP3 DESCARGA EL CORREO AL EQUIPO"
      nodes={nodes}
      links={[{ from: "client", to: "server" }]}
      cards={[
        { id: "intro", x: 256, y: 52, width: 288, title: "POP3 RECUPERA MENSAJES DEL SERVIDOR", body: "Suele usar TCP 110 o 995", tone: "warn" },
        { id: "auth", x: 514, y: 288, width: 208, title: "ACCESO AL BUZON", body: "El cliente se identifica", tone: "active" },
        { id: "summary", x: 218, y: 360, width: 364, title: "POP3 ESTA PENSADO PARA DESCARGAR CORREO", body: "El mensaje pasa del servidor al equipo", tone: "success" },
      ]}
      packets={[
        { id: "open", label: "TCP 110", tone: "tertiary", width: 82 },
        { id: "auth", label: "USER/PASS", tone: "primary", width: 92 },
        { id: "mail", label: "MAIL", tone: "secondary", width: 64 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "client", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "open", from: "client", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "server", tone: "success" }], showCards: ["auth"], motions: [{ packetId: "auth", from: "client", to: "server" }] },
        { id: "step-4", highlights: [{ nodeId: "client", tone: "active" }], motions: [{ packetId: "mail", from: "server", to: "client", duration: 0.78 }] },
        { id: "step-5", highlights: [{ nodeId: "client", tone: "success" }, { nodeId: "server", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
