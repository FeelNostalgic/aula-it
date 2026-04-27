"use client"

import { ApplicationProtocolAnimation } from "./application-protocol-animation"

const nodes = [
  {
    id: "browser",
    label: "Navegador",
    x: 148,
    y: 230,
    kind: "pc" as const,
    info: {
      id: "browser",
      label: "Navegador",
      facts: [
        { label: "pide", value: "Paginas y recursos web" },
        { label: "usa", value: "HTTP o HTTPS" },
      ],
    },
  },
  {
    id: "server",
    label: "Servidor web",
    x: 652,
    y: 230,
    kind: "server" as const,
    info: {
      id: "server",
      label: "Servidor web",
      facts: [
        { label: "http", value: "Puerto 80" },
        { label: "https", value: "Puerto 443" },
      ],
    },
  },
]

export function HttpHttpsAnimation() {
  return (
    <ApplicationProtocolAnimation
      headline="LA WEB FUNCIONA CON PETICION Y RESPUESTA"
      nodes={nodes}
      links={[{ from: "browser", to: "server" }]}
      cards={[
        { id: "http", x: 260, y: 52, width: 280, title: "HTTP PIDE Y RECIBE PAGINAS", body: "Normalmente usa TCP 80", tone: "warn" },
        { id: "https", x: 502, y: 288, width: 222, title: "HTTPS ANADE CIFRADO", body: "Protege los datos sobre TCP 443", tone: "active" },
        { id: "summary", x: 214, y: 360, width: 372, title: "HTTPS PROTEGE LA WEB MEJOR QUE HTTP", body: "El candado indica una conexión cifrada", tone: "success" },
      ]}
      packets={[
        { id: "get", label: "GET", tone: "primary", width: 64 },
        { id: "html", label: "HTML", tone: "secondary", width: 72 },
        { id: "tls", label: "TLS", tone: "tertiary", width: 62 },
      ]}
      steps={[
        { id: "step-1", highlights: [{ nodeId: "browser", tone: "warn" }], showCards: ["http"] },
        { id: "step-2", highlights: [{ nodeId: "server", tone: "active" }], motions: [{ packetId: "get", from: "browser", to: "server" }] },
        { id: "step-3", highlights: [{ nodeId: "browser", tone: "success" }], motions: [{ packetId: "html", from: "server", to: "browser", duration: 0.76 }] },
        { id: "step-4", highlights: [{ nodeId: "browser", tone: "active" }, { nodeId: "server", tone: "active" }], showCards: ["https"], motions: [{ packetId: "tls", from: "browser", to: "server" }] },
        { id: "step-5", highlights: [{ nodeId: "browser", tone: "success" }, { nodeId: "server", tone: "success" }], showCards: ["summary"] },
      ]}
    />
  )
}
