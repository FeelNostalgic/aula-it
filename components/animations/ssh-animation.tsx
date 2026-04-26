"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "admin",
    label: "Admin",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "admin",
      label: "Admin",
      facts: [
        { label: "tcp", value: "Puerto 22" },
        { label: "usa", value: "Terminal remota" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor",
      facts: [
        { label: "ssh", value: "Acceso remoto seguro" },
        { label: "ejecuta", value: "Comandos del admin" },
      ],
    },
  },
]

export function SshAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="SSH PERMITE ENTRAR Y ADMINISTRAR EN REMOTO"
      nodes={nodes}
      links={[{ from: "admin", to: "server" }]}
      cards={[
        { id: "intro", x: 250, y: 52, width: 300, title: "SSH ABRE UNA SESION REMOTA SEGURA", body: "Normalmente usa TCP 22", tone: "warn" },
        { id: "cmd", x: 508, y: 288, width: 214, title: "COMANDOS Y RESPUESTAS", body: "Todo viaja cifrado", tone: "active" },
        { id: "summary", x: 222, y: 360, width: 356, title: "SSH SIRVE PARA ADMINISTRAR UN SERVIDOR CON SEGURIDAD", body: "Muy util para gestion remota", tone: "success" },
      ]}
      packets={[
        { id: "login", label: "LOGIN", tone: "primary", width: 74 },
        { id: "cmd", label: "CMD", tone: "tertiary", width: 62 },
        { id: "out", label: "OUTPUT", tone: "secondary", width: 78 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "admin", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "login", from: "admin", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "server", tone: "success" }], showCards: ["cmd"], motions: [{ packetId: "cmd", from: "admin", to: "server" }] },
        { id: "step-4", highlights: [{ nodeId: "admin", tone: "active" }], motions: [{ packetId: "out", from: "server", to: "admin", duration: 0.76 }] },
        { id: "step-5", highlights: [{ nodeId: "admin", tone: "success" }, { nodeId: "server", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
