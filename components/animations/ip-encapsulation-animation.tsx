"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, RouterGlyph, ServerGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 }

const N = {
  src: { x: 112, y: 320 },
  r1: { x: 280, y: 176 },
  r2: { x: 520, y: 176 },
  dst: { x: 688, y: 320 },
} as const

const TOOLTIP_ANCHORS = {
  src: { x: N.src.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.src.y + NETWORK_DEVICE_STYLE.pc.radius },
  r1: { x: N.r1.x + NETWORK_DEVICE_STYLE.router.radius, y: N.r1.y + NETWORK_DEVICE_STYLE.router.radius },
  r2: { x: N.r2.x + NETWORK_DEVICE_STYLE.router.radius, y: N.r2.y + NETWORK_DEVICE_STYLE.router.radius },
  dst: { x: N.dst.x + NETWORK_DEVICE_STYLE.server.radius, y: N.dst.y + NETWORK_DEVICE_STYLE.server.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  src: {
    id: "src",
    label: "PC A",
    ip: "192.168.1.10",
    mask: "24",
    gateway: "192.168.1.1",
    facts: [
      { label: "crea", value: "Paquete IP" },
      { label: "tramo", value: "Sale en trama Ethernet" },
    ],
  },
  r1: {
    id: "r1",
    label: "Router 1",
    facts: [
      { label: "quita", value: "Trama del tramo 1" },
      { label: "mantiene", value: "El mismo paquete IP" },
      { label: "crea", value: "Nueva trama para el siguiente tramo" },
    ],
  },
  r2: {
    id: "r2",
    label: "Router 2",
    facts: [
      { label: "quita", value: "Trama PPP" },
      { label: "sigue", value: "Mismo destino IP" },
      { label: "reencap", value: "Nueva trama Ethernet" },
    ],
  },
  dst: {
    id: "dst",
    label: "Servidor B",
    ip: "172.16.0.20",
    mask: "24",
    facts: [
      { label: "recibe", value: "Ultima trama" },
      { label: "extrae", value: "El paquete IP" },
    ],
  },
}

export function IpEncapsulationAnimation() {
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
          ipFill: "#0F172A",
          ipText: "#F8FAFC",
          ethFill: "#DBEAFE",
          ethText: "#1D4ED8",
          pppFill: "#F3E8FF",
          pppText: "#7C3AED",
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
          ipFill: "#E2E8F0",
          ipText: "#0F172A",
          ethFill: "#172554",
          ethText: "#BFDBFE",
          pppFill: "#2E1065",
          pppText: "#E9D5FF",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-src"), { x: N.src.x, y: N.src.y })
    gsap.set(q("#node-r1"), { x: N.r1.x, y: N.r1.y })
    gsap.set(q("#node-r2"), { x: N.r2.x, y: N.r2.y })
    gsap.set(q("#node-dst"), { x: N.dst.x, y: N.dst.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-eth-up"), { x: N.src.x, y: N.src.y, opacity: 0 })
    gsap.set(q("#pkt-ppp-mid"), { x: N.r1.x, y: N.r1.y, opacity: 0 })
    gsap.set(q("#pkt-eth-down"), { x: N.r2.x, y: N.r2.y, opacity: 0 })
    gsap.set(q("#ip-core-card, #router-card, #summary-card"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-src .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#ip-core-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }, "<0.08")

    tl.addLabel("step-2")
      .to(q("#pkt-eth-up"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-eth-up"), { x: N.r1.x, y: N.r1.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#node-r1 .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<0.35")

    tl.addLabel("step-3")
      .to(q("#pkt-eth-up"), { opacity: 0, duration: 0.12 })
      .to(q("#router-card"), { opacity: 1, y: 0, duration: 0.32 }, "<0.05")

    tl.addLabel("step-4")
      .to(q("#pkt-ppp-mid"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-ppp-mid"), { x: N.r2.x, y: N.r2.y, duration: 0.82, ease: "power2.inOut" })
      .to(q("#node-r2 .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<0.42")

    tl.addLabel("step-5")
      .to(q("#pkt-ppp-mid"), { opacity: 0, duration: 0.12 })
      .to(q("#pkt-eth-down"), { opacity: 1, duration: 0.05 }, "<0.04")
      .to(q("#pkt-eth-down"), { x: N.dst.x, y: N.dst.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#node-dst .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.42")

    tl.addLabel("step-6")
      .to(q("#pkt-eth-down"), { opacity: 0, duration: 0.12 })
      .to(q("#summary-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }, "<0.05")

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
        <line x1={N.src.x} y1={N.src.y} x2={N.r1.x} y2={N.r1.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.r1.x} y1={N.r1.y} x2={N.r2.x} y2={N.r2.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.r2.x} y1={N.r2.y} x2={N.dst.x} y2={N.dst.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

        <text x="196" y="228" textAnchor="middle" fill={C.ethText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          TRAMO 1 - ETH
        </text>
        <text x="400" y="148" textAnchor="middle" fill={C.pppText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          TRAMO 2 - PPP
        </text>
        <text x="604" y="228" textAnchor="middle" fill={C.ethText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          TRAMO 3 - ETH
        </text>

        <g id="node-src" onMouseEnter={() => handleNodeEnter("src")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC A
          </text>
        </g>

        <g id="node-r1" onMouseEnter={() => handleNodeEnter("r1")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
            Router 1
          </text>
        </g>

        <g id="node-r2" onMouseEnter={() => handleNodeEnter("r2")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
            Router 2
          </text>
        </g>

        <g id="node-dst" onMouseEnter={() => handleNodeEnter("dst")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.server.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <ServerGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.server.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Servidor B
          </text>
        </g>

        <g id="ip-core-card" pointerEvents="none">
          <rect x="28" y="48" width="206" height="56" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="131" y="67" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            NÚCLEO QUE SE MANTIENE
          </text>
          <rect x="79" y="76" width="104" height="18" rx="9" fill={C.ipFill} />
          <text x="131" y="88" textAnchor="middle" fill={C.ipText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            PAQUETE IP
          </text>
        </g>

        <g id="router-card" pointerEvents="none">
          <rect x="250" y="48" width="308" height="60" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="404" y="69" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            EL ROUTER CAMBIA LA TRAMA, NO LA IP
          </text>
          <text x="404" y="89" textAnchor="middle" fill={C.fg} fontSize="8.1" fontFamily="var(--font-mono)">
            Cambia la trama y mantiene el mismo paquete IP
          </text>
        </g>

        <g id="summary-card" pointerEvents="none">
          <rect x="562" y="46" width="188" height="60" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="656" y="67" textAnchor="middle" fill={C.success} fontSize="8.75" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA NUEVA POR TRAMO
          </text>
          <text x="656" y="87" textAnchor="middle" fill={C.fg} fontSize="8.1" fontFamily="var(--font-mono)">
            La IP sigue igual en el viaje
          </text>
        </g>

        <g id="pkt-eth-up" pointerEvents="none">
          <rect x="-54" y="-15" width="108" height="30" rx="15" fill={C.ethFill} />
          <text x="0" y="-2" textAnchor="middle" fill={C.ethText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA ETH
          </text>
          <rect x="-28" y="0" width="56" height="12" rx="6" fill={C.ipFill} />
          <text x="0" y="8" textAnchor="middle" fill={C.ipText} fontSize="7.5" fontWeight="700" fontFamily="var(--font-mono)">
            PAQ IP
          </text>
        </g>

        <g id="pkt-ppp-mid" pointerEvents="none">
          <rect x="-52" y="-15" width="104" height="30" rx="15" fill={C.pppFill} />
          <text x="0" y="-2" textAnchor="middle" fill={C.pppText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA PPP
          </text>
          <rect x="-28" y="0" width="56" height="12" rx="6" fill={C.ipFill} />
          <text x="0" y="8" textAnchor="middle" fill={C.ipText} fontSize="7.5" fontWeight="700" fontFamily="var(--font-mono)">
            PAQ IP
          </text>
        </g>

        <g id="pkt-eth-down" pointerEvents="none">
          <rect x="-54" y="-15" width="108" height="30" rx="15" fill={C.ethFill} />
          <text x="0" y="-2" textAnchor="middle" fill={C.ethText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA ETH
          </text>
          <rect x="-28" y="0" width="56" height="12" rx="6" fill={C.ipFill} />
          <text x="0" y="8" textAnchor="middle" fill={C.ipText} fontSize="7.5" fontWeight="700" fontFamily="var(--font-mono)">
            PAQ IP
          </text>
        </g>
      </svg>
    </div>
  )
}
