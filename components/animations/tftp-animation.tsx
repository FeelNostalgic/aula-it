"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "client",
    label: "Cliente TFTP",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "client",
      label: "Cliente TFTP",
      facts: [
        { label: "udp", value: "Empieza en puerto 69" },
        { label: "recibe", value: "Bloques y devuelve ACK" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor TFTP",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor TFTP",
      facts: [
        { label: "sirve", value: "Imagenes y configuracion" },
        { label: "flujo", value: "Bloque, ACK, bloque" },
      ],
    },
  },
]

export function TftpAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="TFTP TRANSFIERE ARCHIVOS PEQUENOS POR BLOQUES SOBRE UDP"
      nodes={nodes}
      links={[{ from: "client", to: "server" }]}
      cards={[
        { id: "intro", x: 226, y: 52, width: 348, title: "TFTP PRIORIZA SIMPLICIDAD", body: "Suele aparecer en arranque por red y tareas básicas", tone: "warn" },
        { id: "blocks", x: 484, y: 320, width: 236, title: "DATA BLOQUES + ACK", body: "Cada bloque debe confirmarse antes de seguir", tone: "active" },
        { id: "summary", x: 196, y: 390, width: 408, title: "MENOS FUNCIONES, MENOS COMPLEJIDAD", body: "Busca mover un fichero sin adornos ni opciones avanzadas", tone: "success" },
      ]}
      packets={[
        { id: "rrq", label: "RRQ", tone: "tertiary", width: 64 },
        { id: "data1", label: "DATA 1", tone: "primary", width: 82 },
        { id: "ack1", label: "ACK 1", tone: "secondary", width: 78 },
        { id: "dataf", label: "DATA FIN", tone: "primary", width: 92 },
        { id: "ackf", label: "ACK FIN", tone: "secondary", width: 88 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "client", tone: "warn" }], showCards: ["intro"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "rrq", from: "client", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "client", tone: "active" }], motions: [{ packetId: "data1", from: "server", to: "client", duration: 0.76 }], showCards: ["blocks"] },
        {
          id: "step-4",
          highlights: [{ nodeId: "server", tone: "active" }],
          motions: [
            { packetId: "ack1", from: "client", to: "server", duration: 0.64 },
            { packetId: "dataf", from: "server", to: "client", duration: 0.8 },
          ],
        },
        {
          id: "step-5",
          highlights: [{ nodeId: "client", tone: "success" }, { nodeId: "server", tone: "success" }],
          motions: [{ packetId: "ackf", from: "client", to: "server", duration: 0.62 }],
          showCards: ["summary"],
        },
      ]}
    />
  )
}
