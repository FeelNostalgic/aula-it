"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "sender",
    label: "Remitente",
    x: 118,
    y: 252,
    kind: "pc" as const,
    info: {
      id: "sender",
      label: "Remitente",
      facts: [
        { label: "correo", value: "Redacta el mensaje" },
        { label: "entrega", value: "Al servidor SMTP" },
      ],
    },
  },
  {
    id: "smtp",
    label: "Servidor SMTP",
    x: 400,
    y: 170,
    kind: "server" as const,
    fontSize: 12.5,
    info: {
      id: "smtp",
      label: "Servidor SMTP",
      facts: [
        { label: "tcp", value: "25 o 587" },
        { label: "rol", value: "Reenvia correo saliente" },
      ],
    },
  },
  {
    id: "mailbox",
    label: "Servidor destino",
    x: 680,
    y: 130,
    kind: "server" as const,
    fontSize: 12.5,
    info: {
      id: "mailbox",
      label: "Servidor destino",
      facts: [
        { label: "guarda", value: "El correo recibido" },
        { label: "buzon", value: "Listo para leer" },
      ],
    },
  },
]

export function SmtpAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="SMTP EMPUJA EL CORREO HACIA EL DESTINO"
      headlineY={122}
      nodes={nodes}
      links={[
        { from: "sender", to: "smtp" },
        { from: "smtp", to: "mailbox" },
      ]}
      cards={[
        { id: "intro", x: 254, y: 52, width: 292, title: "SMTP ENTREGA EL MENSAJE AL SERVIDOR", body: "No lee correo: lo envía", tone: "warn" },
        { id: "relay", x: 522, y: 244, width: 186, title: "REENVIO ENTRE SERVIDORES", body: "Lo acerca al buzon destino", tone: "active" },
        { id: "summary", x: 242, y: 390, width: 316, title: "SMTP SIRVE PARA ENVIAR CORREO", body: "Después otro protocolo lo recupera", tone: "success" },
      ]}
      packets={[
        { id: "submit", label: "MAIL", tone: "primary", width: 70 },
        { id: "relay", label: "RELAY", tone: "tertiary", width: 76 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "sender", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "smtp", tone: "active" }], motions: [{ packetId: "submit", from: "sender", to: "smtp" }] },
        { id: "step-3", highlights: [{ nodeId: "mailbox", tone: "active" }], showCards: ["relay"], motions: [{ packetId: "relay", from: "smtp", to: "mailbox", duration: 0.74 }] },
        { id: "step-4", highlights: [{ nodeId: "mailbox", tone: "success" }] },
        { id: "step-5", highlights: [{ nodeId: "sender", tone: "success" }, { nodeId: "smtp", tone: "success" }, { nodeId: "mailbox", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
