"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "client",
    label: "Cliente FTP",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "client",
      label: "Cliente FTP",
      facts: [
        { label: "tcp", value: "Puerto 21" },
        { label: "rol", value: "Pide o envia archivos" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor FTP",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor FTP",
      facts: [
        { label: "tcp", value: "Puerto 21" },
        { label: "guarda", value: "Archivos y carpetas" },
      ],
    },
  },
]

export function FtpAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="CLIENTE Y SERVIDOR INTERCAMBIAN ARCHIVOS"
      nodes={nodes}
      links={[{ from: "client", to: "server" }]}
      cards={[
        { id: "intro", x: 274, y: 52, width: 252, title: "FTP USA TCP 21", body: "Abre una sesion para mover archivos", tone: "warn" },
        { id: "transfer", x: 506, y: 288, width: 220, title: "ORDENES Y DATOS", body: "Puede listar, subir o descargar", tone: "active" },
        { id: "summary", x: 216, y: 360, width: 368, title: "FTP MUEVE FICHEROS, PERO NO CIFRA POR DEFECTO", body: "Hoy suele sustituirse por opciones mas seguras", tone: "success" },
      ]}
      packets={[
        { id: "open", label: "TCP 21", tone: "tertiary", width: 76 },
        { id: "login", label: "USER/PASS", tone: "primary", width: 92 },
        { id: "file", label: "ARCHIVO", tone: "secondary", width: 84 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "client", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "open", from: "client", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "server", tone: "success" }], showCards: ["transfer"], motions: [{ packetId: "login", from: "client", to: "server" }] },
        { id: "step-4", highlights: [{ nodeId: "client", tone: "active" }], motions: [{ packetId: "file", from: "server", to: "client", duration: 0.78 }] },
        { id: "step-5", highlights: [{ nodeId: "client", tone: "success" }, { nodeId: "server", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
