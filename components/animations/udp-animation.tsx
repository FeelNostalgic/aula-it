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
  loss: { x: 444, y: 148 },
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
      { label: "udp", value: "No abre conexión" },
      { label: "envía", value: "Datagramas directos" },
    ],
  },
  server: {
    id: "server",
    label: "Servidor",
    facts: [
      { label: "udp", value: "Recibe si llegan" },
      { label: "sin", value: "No confirma con ACK" },
    ],
  },
}

export function UdpAnimation() {
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
        udpFill: "#FEF3C7",
        udpText: "#92400E",
        noteFill: "#FEE2E2",
        noteText: "#B91C1C",
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
        udpFill: "#78350F",
        udpText: "#FDE68A",
        noteFill: "#450A0A",
        noteText: "#FCA5A5",
      }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-client"), { x: N.client.x, y: N.client.y })
    gsap.set(q("#node-server"), { x: N.server.x, y: N.server.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-a, #pkt-b"), { x: N.client.x, y: N.client.y, opacity: 0 })
    gsap.set(q("#no-ack-card, #summary-card"), { opacity: 0, y: 8 })
    gsap.set(q("#loss-mark"), { opacity: 0 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-client .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#no-ack-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.08")

    tl.addLabel("step-2")
      .to(q("#pkt-a"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-b"), { opacity: 1, duration: 0.05 }, "<0.06")
      .to(q("#pkt-a"), { x: N.loss.x, y: N.loss.y, duration: 0.52, ease: "power2.inOut" })
      .to(q("#pkt-b"), { x: N.server.x, y: N.server.y, duration: 0.72, ease: "power2.inOut" }, "<")

    tl.addLabel("step-3")
      .to(q("#pkt-a"), { opacity: 0.12, duration: 0.12 })
      .to(q("#loss-mark"), { opacity: 1, duration: 0.2 }, "<")
      .to(q("#pkt-b"), { opacity: 1, duration: 0.1 }, "<")

    tl.addLabel("step-4")
      .to(q("#pkt-a"), { opacity: 0, duration: 0.08 })
      .to(q("#node-server .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.02")

    tl.addLabel("step-5")
      .to(q("#pkt-b"), { opacity: 0, duration: 0.12 })
      .to(q("#summary-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" }, "<0.04")
      .to(q("#node-client .node-circle"), { stroke: C.active, duration: 0.2 }, "<")

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
          SIN HANDSHAKE Y SIN CONFIRMACIÓN
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

        <g id="no-ack-card" pointerEvents="none">
          <rect x="278" y="52" width="244" height="48" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="70" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            UDP ENVIA DIRECTO, SIN PREPARAR SESION
          </text>
          <text x="400" y="86" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            No espera handshake ni confirmacion
          </text>
        </g>

        <g id="summary-card" pointerEvents="none">
          <rect x="246" y="360" width="308" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="377" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            UDP PRIORIZA LIGEREZA Y RAPIDEZ
          </text>
          <text x="400" y="391" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Útil cuando importa más llegar rápido que controlar todo
          </text>
        </g>

        <g id="loss-mark" pointerEvents="none">
          <circle cx={N.loss.x} cy={N.loss.y} r="18" fill={C.noteFill} />
          <text x={N.loss.x} y={N.loss.y + 4} textAnchor="middle" fill={C.noteText} fontSize="16" fontWeight="900">
            !
          </text>
        </g>

        <g id="pkt-a" pointerEvents="none">
          <PacketPill label="UDP D1" fill={C.udpFill} textColor={C.udpText} width={74} />
        </g>

        <g id="pkt-b" pointerEvents="none">
          <PacketPill label="UDP D2" fill={C.udpFill} textColor={C.udpText} width={74} />
        </g>
      </svg>
    </div>
  )
}
