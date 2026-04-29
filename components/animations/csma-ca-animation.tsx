"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { PacketPill } from "./network-visual-primitives"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 } as const

const N = {
  a: { x: 150, y: 250 },
  ap: { x: 400, y: 150 },
  b: { x: 650, y: 250 },
} as const

const TOOLTIP_ANCHORS = {
  a: { x: N.a.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.a.y + NETWORK_DEVICE_STYLE.pc.radius },
  ap: { x: N.ap.x + NETWORK_DEVICE_STYLE.router.radius, y: N.ap.y + NETWORK_DEVICE_STYLE.router.radius },
  b: { x: N.b.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.b.y + NETWORK_DEVICE_STYLE.pc.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  a: {
    id: "a",
    label: "Estacion A",
    facts: [
      { label: "quiere", value: "Transmitir por Wi-Fi" },
      { label: "usa", value: "CSMA/CA" },
    ],
  },
  ap: {
    id: "ap",
    label: "Access Point",
    facts: [
      { label: "coordina", value: "Celda inalambrica" },
      { label: "ack", value: "Confirma tramas validas" },
    ],
  },
  b: {
    id: "b",
    label: "Estacion B",
    facts: [
      { label: "comparte", value: "El mismo canal" },
      { label: "espera", value: "Backoff si el canal esta ocupado" },
    ],
  },
}

function AccessPointGlyph({ stroke }: { stroke: string }) {
  return (
    <>
      <circle r="8" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M -22 -4 C -12 -18 12 -18 22 -4" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M -32 -12 C -16 -34 16 -34 32 -12" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="8" x2="0" y2="22" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  )
}

export function CsmaCaAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()
  const { selectedNode, handleNodeEnter, scheduleHide, cancelHide } = useNodeTooltip()

  const C =
    resolvedTheme === "light"
      ? {
          bg: "#E5EAF0",
          fg: "#0F172A",
          idle: "#94A3B8",
          active: "#2563EB",
          success: "#059669",
          warn: "#D97706",
          danger: "#DC2626",
          panel: "#FFFFFF",
          subText: "#475569",
          waitFill: "#FEF3C7",
          waitText: "#92400E",
          dataFill: "#DBEAFE",
          dataText: "#1D4ED8",
          okFill: "#DCFCE7",
          okText: "#047857",
        }
      : {
          bg: "#1F2937",
          fg: "#E5E7EB",
          idle: "#64748B",
          active: "#38BDF8",
          success: "#34D399",
          warn: "#FBBF24",
          danger: "#F87171",
          panel: "#111827",
          subText: "#A3B0C2",
          waitFill: "#78350F",
          waitText: "#FDE68A",
          dataFill: "#172554",
          dataText: "#BFDBFE",
          okFill: "#052E2B",
          okText: "#A7F3D0",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#node-ap"), { x: N.ap.x, y: N.ap.y })
    gsap.set(q("#node-b"), { x: N.b.x, y: N.b.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5 })
    gsap.set(q(".packet"), { opacity: 0 })
    gsap.set(q("#data-frame"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#ack-frame"), { x: N.ap.x, y: N.ap.y })
    gsap.set(q("#listen-card, #difs-card, #backoff-card, #tx-card, #ack-card, #retry-card"), { opacity: 0, y: 8 })
    gsap.set(q(".radio-ring"), { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" })
    gsap.set(q("#backoff-meter"), { scaleX: 0, transformOrigin: "left center" })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-a .node-circle"), { stroke: C.warn, strokeWidth: 2.6, duration: 0.24 })
      .to(q(".radio-ring"), { opacity: 0.45, scale: 1, duration: 0.36, stagger: 0.08 }, "<")
      .to(q("#listen-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.08")

    tl.addLabel("step-2")
      .to(q("#difs-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" })
      .to(q("#node-b .node-circle"), { stroke: C.idle, strokeWidth: 1.5, duration: 0.18 }, "<")

    tl.addLabel("step-3")
      .to(q("#backoff-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" })
      .to(q("#backoff-meter"), { scaleX: 1, duration: 0.7, ease: "steps(5)" }, "<0.1")

    tl.addLabel("step-4")
      .to(q("#tx-card"), { opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.2)" })
      .to(q("#data-frame"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#data-frame"), { x: N.ap.x, y: N.ap.y, duration: 0.82, ease: "power2.inOut" })
      .to(q("#data-frame"), { opacity: 0, duration: 0.06 })
      .to(q("#node-ap .node-circle"), { stroke: C.active, strokeWidth: 2.8, duration: 0.22 }, "<0.16")

    tl.addLabel("step-5")
      .to(q("#ack-card"), { opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.2)" })
      .to(q("#ack-frame"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#ack-frame"), { x: N.a.x, y: N.a.y, duration: 0.62, ease: "power2.inOut" })
      .to(q("#ack-frame"), { opacity: 0, duration: 0.06 })
      .to(q("#node-a .node-circle, #node-ap .node-circle"), { stroke: C.success, strokeWidth: 2.8, duration: 0.2 }, "<0.12")

    tl.addLabel("step-6")
      .to(q("#retry-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" })

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.idle, C.success, C.warn, registerTimeline])

  const activeInfo = selectedNode ? NODE_INFO[selectedNode] : null
  const activeAnchor = selectedNode ? TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS] : null

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {activeInfo && selectedNode && activeAnchor && (
          <NodeInfoCard
            node={activeInfo}
            anchorX={activeAnchor.x}
            anchorY={activeAnchor.y}
            viewBoxW={VIEWBOX.width}
            viewBoxH={VIEWBOX.height}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          />
        )}
      </AnimatePresence>

      <svg ref={svgRef} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <text x="400" y="36" textAnchor="middle" fill={C.subText} fontSize="10" fontWeight="800" fontFamily="var(--font-mono)">
          CSMA/CA EN WI-FI: EVITAR COLISIONES, NO DETECTARLAS
        </text>

        <circle className="radio-ring" cx={N.ap.x} cy={N.ap.y} r="110" fill="none" stroke={C.active} strokeWidth="1.4" strokeDasharray="7 5" />
        <circle className="radio-ring" cx={N.ap.x} cy={N.ap.y} r="170" fill="none" stroke={C.active} strokeWidth="1.2" strokeDasharray="7 5" />

        <g id="node-a" onMouseEnter={() => handleNodeEnter("a")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">STA A</text>
        </g>

        <g id="node-ap" onMouseEnter={() => handleNodeEnter("ap")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <AccessPointGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">AP</text>
        </g>

        <g id="node-b" onMouseEnter={() => handleNodeEnter("b")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">STA B</text>
        </g>

        <g id="listen-card" pointerEvents="none">
          <rect x="92" y="92" width="190" height="42" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="187" y="109" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">ESCUCHAR CANAL</text>
          <text x="187" y="123" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">Si esta ocupado, no habla</text>
        </g>

        <g id="difs-card" pointerEvents="none">
          <rect x="306" y="72" width="188" height="38" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="400" y="96" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">CANAL LIBRE + DIFS</text>
        </g>

        <g id="backoff-card" pointerEvents="none">
          <rect x="256" y="332" width="288" height="48" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="350" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">BACKOFF ALEATORIO</text>
          <rect x="314" y="362" width="172" height="8" rx="4" fill={C.idle} opacity="0.35" />
          <rect id="backoff-meter" x="314" y="362" width="172" height="8" rx="4" fill={C.warn} />
        </g>

        <g id="tx-card" pointerEvents="none">
          <rect x="310" y="292" width="180" height="32" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="400" y="313" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">CONTADOR A CERO: ENVIA</text>
        </g>

        <g id="ack-card" pointerEvents="none">
          <rect x="512" y="92" width="198" height="42" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="611" y="109" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">ACK RECIBIDO</text>
          <text x="611" y="123" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">La trama llego correctamente</text>
        </g>

        <g id="retry-card" pointerEvents="none">
          <rect x="142" y="404" width="516" height="36" rx="18" fill={C.panel} stroke={C.danger} strokeWidth="1.4" />
          <text x="400" y="426" textAnchor="middle" fill={C.danger} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
            SIN ACK: ASUME PERDIDA Y REINTENTA CON OTRO BACKOFF
          </text>
        </g>

        <g id="data-frame" className="packet" pointerEvents="none">
          <PacketPill label="DATA" fill={C.dataFill} textColor={C.dataText} width={70} stroke={C.active} />
        </g>

        <g id="ack-frame" className="packet" pointerEvents="none">
          <PacketPill label="ACK" fill={C.okFill} textColor={C.okText} width={58} stroke={C.success} />
        </g>
      </svg>
    </div>
  )
}
