"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, ServerGlyph } from "./network-device-icons"
import { PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 }

const N = {
  client: { x: 148, y: 230 },
  server: { x: 652, y: 230 },
} as const

const TOOLTIP_ANCHORS = {
  client: { x: N.client.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.client.y + NETWORK_DEVICE_STYLE.pc.radius },
  server: { x: N.server.x + NETWORK_DEVICE_STYLE.server.radius, y: N.server.y + NETWORK_DEVICE_STYLE.server.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  client: {
    id: "client",
    label: "Cliente",
    facts: [
      { label: "tcp", value: "Abre conexion" },
      { label: "envia", value: "Datos y espera ACK" },
    ],
  },
  server: {
    id: "server",
    label: "Servidor",
    facts: [
      { label: "tcp", value: "Acepta conexion" },
      { label: "confirma", value: "Recepcion de datos" },
    ],
  },
}

export function TcpAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()
  const {
    selectedNode,
    handleNodeEnter,
    scheduleHide,
    cancelHide,
  } = useNodeTooltip()

  const C =
    resolvedTheme === "light"
      ? {
          bg: "#E5EAF0",
          fg: "#0F172A",
          idle: "#94A3B8",
          active: "#2563EB",
          success: "#059669",
          warn: "#D97706",
          panel: "#FFFFFF",
          subText: "#475569",
          synFill: "#DBEAFE",
          synText: "#1D4ED8",
          dataFill: "#0F172A",
          dataText: "#F8FAFC",
          ackFill: "#DCFCE7",
          ackText: "#047857",
        }
      : {
          bg: "#1F2937",
          fg: "#E5E7EB",
          idle: "#64748B",
          active: "#38BDF8",
          success: "#34D399",
          warn: "#FBBF24",
          panel: "#111827",
          subText: "#A3B0C2",
          synFill: "#172554",
          synText: "#BFDBFE",
          dataFill: "#E2E8F0",
          dataText: "#0F172A",
          ackFill: "#052E2B",
          ackText: "#A7F3D0",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-client"), { x: N.client.x, y: N.client.y })
    gsap.set(q("#node-server"), { x: N.server.x, y: N.server.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-syn"), { x: N.client.x, y: N.client.y, opacity: 0 })
    gsap.set(q("#pkt-synack"), { x: N.server.x, y: N.server.y, opacity: 0 })
    gsap.set(q("#pkt-ack, #pkt-data"), { x: N.client.x, y: N.client.y, opacity: 0 })
    gsap.set(q("#handshake-card, #ack-card, #summary-card"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-client .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#handshake-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.08")

    tl.addLabel("step-2")
      .to(q("#pkt-syn"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-syn"), { x: N.server.x, y: N.server.y, duration: 0.55, ease: "power2.inOut" })
      .to(q("#pkt-syn"), { opacity: 0, duration: 0.05 })
      .to(q("#pkt-synack"), { opacity: 1, duration: 0.05 }, "<0.04")
      .to(q("#pkt-synack"), { x: N.client.x, y: N.client.y, duration: 0.55, ease: "power2.inOut" })
      .to(q("#pkt-synack"), { opacity: 0, duration: 0.05 })
      .to(q("#pkt-ack"), { opacity: 1, duration: 0.05 }, "<0.04")
      .to(q("#pkt-ack"), { x: N.server.x, y: N.server.y, duration: 0.55, ease: "power2.inOut" })
      .to(q("#pkt-ack"), { opacity: 0, duration: 0.05 })
      .to(q("#node-server .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.22 }, "<0.1")

    tl.addLabel("step-3")
      .to(q("#pkt-data"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-data"), { x: N.server.x, y: N.server.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#node-server .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.38")

    tl.addLabel("step-4")
      .to(q("#pkt-data"), { opacity: 0, duration: 0.08 })
      .to(q("#pkt-ack"), { opacity: 1, duration: 0.05 }, "<0.02")
      .to(q("#pkt-ack"), { x: N.client.x, y: N.client.y, duration: 0.66, ease: "power2.inOut" })
      .to(q("#pkt-ack"), { opacity: 0, duration: 0.08 })
      .to(q("#ack-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.1")
      .to(q("#node-client .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.3")

    tl.addLabel("step-5")
      .to(q("#summary-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" })

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.success, C.warn, registerTimeline])

  const activeInfo = selectedNode ? NODE_INFO[selectedNode] : null

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {activeInfo && (
          <NodeInfoCard
            node={activeInfo}
            anchorX={TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS].x}
            anchorY={TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS].y}
            viewBoxW={VIEWBOX.width}
            viewBoxH={VIEWBOX.height}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          />
        )}
      </AnimatePresence>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1={N.client.x} y1={N.client.y} x2={N.server.x} y2={N.server.y} stroke={C.idle} strokeWidth="1.8" strokeDasharray="7 5" />
        <text x="400" y="208" textAnchor="middle" fill={C.subText} fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)">
          CONEXION ORIENTADA A SESION
        </text>

        <g id="node-client" onMouseEnter={() => handleNodeEnter("client")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Cliente
          </text>
        </g>

        <g id="node-server" onMouseEnter={() => handleNodeEnter("server")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.server.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <ServerGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.server.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Servidor
          </text>
        </g>

        <g id="handshake-card" pointerEvents="none">
          <rect x="282" y="52" width="236" height="48" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="70" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            TCP PRIMERO ABRE LA CONEXION
          </text>
          <text x="400" y="86" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Handshake simple: SYN, SYN-ACK y ACK
          </text>
        </g>

        <g id="ack-card" pointerEvents="none">
          <rect x="530" y="288" width="194" height="44" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="627" y="305" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            CONFIRMACION DE RECEPCION
          </text>
          <text x="627" y="319" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El receptor avisa de que llego
          </text>
        </g>

        <g id="summary-card" pointerEvents="none">
          <rect x="248" y="360" width="304" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="377" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            TCP PRIORIZA CONTROL, ORDEN Y FIABILIDAD
          </text>
          <text x="400" y="391" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Ideal cuando perder datos no es una opcion
          </text>
        </g>

        <g id="pkt-syn" pointerEvents="none">
          <PacketPill label="SYN" fill={C.synFill} textColor={C.synText} width={62} />
        </g>

        <g id="pkt-synack" pointerEvents="none">
          <PacketPill label="SYN-ACK" fill={C.synFill} textColor={C.synText} width={82} />
        </g>

        <g id="pkt-ack" pointerEvents="none">
          <PacketPill label="ACK" fill={C.ackFill} textColor={C.ackText} width={62} />
        </g>

        <g id="pkt-data" pointerEvents="none">
          <PacketPill label="SEGMENTO" fill={C.dataFill} textColor={C.dataText} width={88} />
        </g>
      </svg>
    </div>
  )
}
