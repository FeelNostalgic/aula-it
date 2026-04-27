"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, RouterGlyph } from "./network-device-icons"
import { PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 }

const N = {
  src: { x: 132, y: 310 },
  router: { x: 398, y: 174 },
  dst: { x: 668, y: 130 },
} as const

const TOOLTIP_ANCHORS = {
  src: { x: N.src.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.src.y + NETWORK_DEVICE_STYLE.pc.radius },
  router: { x: N.router.x + NETWORK_DEVICE_STYLE.router.radius, y: N.router.y + NETWORK_DEVICE_STYLE.router.radius },
  dst: { x: N.dst.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.dst.y + NETWORK_DEVICE_STYLE.pc.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  src: {
    id: "src",
    label: "PC A",
    ip: "192.168.1.10",
    mask: "24",
    gateway: "192.168.1.1",
    facts: [
      { label: "herram", value: "ping" },
      { label: "envía", value: "Echo Request" },
    ],
  },
  router: {
    id: "router",
    label: "Router",
    facts: [
      { label: "reenvia", value: "Mensajes ICMP" },
      { label: "rol", value: "Paso intermedio" },
    ],
  },
  dst: {
    id: "dst",
    label: "PC B",
    ip: "172.16.0.20",
    mask: "24",
    gateway: "172.16.0.1",
    facts: [
      { label: "responde", value: "Echo Reply" },
      { label: "prueba", value: "Conectividad básica" },
    ],
  },
}

export function IcmpAnimation() {
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
        reqFill: "#DBEAFE",
        reqText: "#1D4ED8",
        repFill: "#DCFCE7",
        repText: "#047857",
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
        reqFill: "#172554",
        reqText: "#BFDBFE",
        repFill: "#052E2B",
        repText: "#A7F3D0",
      }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-src"), { x: N.src.x, y: N.src.y })
    gsap.set(q("#node-router"), { x: N.router.x, y: N.router.y })
    gsap.set(q("#node-dst"), { x: N.dst.x, y: N.dst.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-req"), { x: N.src.x, y: N.src.y, opacity: 0 })
    gsap.set(q("#pkt-rep"), { x: N.dst.x, y: N.dst.y, opacity: 0 })
    gsap.set(q("#ping-card, #echo-card, #ok-card"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-src .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#ping-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.08")

    tl.addLabel("step-2")
      .to(q("#pkt-req"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-req"), { x: N.router.x, y: N.router.y, duration: 0.68, ease: "power2.inOut" })
      .to(q("#node-router .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<0.35")

    tl.addLabel("step-3")
      .to(q("#pkt-req"), { x: N.dst.x, y: N.dst.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#echo-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.1")
      .to(q("#node-dst .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.42")

    tl.addLabel("step-4")
      .to(q("#pkt-req"), { opacity: 0, duration: 0.12 })
      .to(q("#pkt-rep"), { opacity: 1, duration: 0.05 }, "<0.02")
      .to(q("#pkt-rep"), { x: N.router.x, y: N.router.y, duration: 0.62, ease: "power2.inOut" })
      .to(q("#pkt-rep"), { x: N.src.x, y: N.src.y, duration: 0.62, ease: "power2.inOut" })

    tl.addLabel("step-5")
      .to(q("#pkt-rep"), { opacity: 0, duration: 0.12 })
      .to(q("#node-src .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.25 }, "<0.02")
      .to(q("#ok-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.08")

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
        <line x1={N.src.x} y1={N.src.y} x2={N.router.x} y2={N.router.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.router.x} y1={N.router.y} x2={N.dst.x} y2={N.dst.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

        <g id="node-src" onMouseEnter={() => handleNodeEnter("src")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC A
          </text>
        </g>

        <g id="node-router" onMouseEnter={() => handleNodeEnter("router")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Router
          </text>
        </g>

        <g id="node-dst" onMouseEnter={() => handleNodeEnter("dst")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC B
          </text>
        </g>

        <g id="ping-card" pointerEvents="none">
          <rect x="40" y="56" width="176" height="44" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="128" y="73" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            PING = COMPROBAR SI RESPONDE
          </text>
          <text x="128" y="87" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Se envía un Echo Request
          </text>
        </g>

        <g id="echo-card" pointerEvents="none">
          <rect x="530" y="224" width="178" height="44" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="619" y="241" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            ECHO REQUEST RECIBIDO
          </text>
          <text x="619" y="255" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El destino prepara un Echo Reply
          </text>
        </g>

        <g id="ok-card" pointerEvents="none">
          <rect x="270" y="358" width="260" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="375" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            HAY CONECTIVIDAD BASICA ENTRE AMBOS
          </text>
          <text x="400" y="389" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            ICMP ayuda a verificar la comunicación con ping
          </text>
        </g>

        <g id="pkt-req" pointerEvents="none">
          <PacketPill label="ECHO REQ" fill={C.reqFill} textColor={C.reqText} width={82} />
        </g>

        <g id="pkt-rep" pointerEvents="none">
          <PacketPill label="ECHO REP" fill={C.repFill} textColor={C.repText} width={82} />
        </g>
      </svg>
    </div>
  )
}
