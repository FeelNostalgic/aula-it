"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph } from "./network-device-icons"
import { PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 } as const
const BUS_Y = 276

const N = {
  a: { x: 130, y: 124 },
  b: { x: 400, y: 124 },
  c: { x: 670, y: 124 },
  collision: { x: 400, y: BUS_Y },
} as const

const BUS_POINTS = {
  a: { x: N.a.x, y: BUS_Y },
  b: { x: N.b.x, y: BUS_Y },
  c: { x: N.c.x, y: BUS_Y },
} as const

const TOOLTIP_ANCHORS = {
  a: { x: N.a.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.a.y + NETWORK_DEVICE_STYLE.pc.radius },
  b: { x: N.b.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.b.y + NETWORK_DEVICE_STYLE.pc.radius },
  c: { x: N.c.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.c.y + NETWORK_DEVICE_STYLE.pc.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  a: {
    id: "a",
    label: "PC A",
    facts: [
      { label: "escucha", value: "Comprueba si el medio está libre" },
      { label: "destino", value: "Quiere llegar a PC C" },
    ],
  },
  b: {
    id: "b",
    label: "PC B",
    facts: [
      { label: "compite", value: "Tambien intenta transmitir" },
      { label: "problema", value: "Arranca a la vez que A" },
    ],
  },
  c: {
    id: "c",
    label: "PC C",
    facts: [
      { label: "medio", value: "Comparte el mismo canal" },
      { label: "recibe", value: "Acepta la trama valida al final" },
    ],
  },
}

export function CsmaCdAnimation() {
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
          danger: "#DC2626",
          panel: "#FFFFFF",
          subText: "#475569",
          busFill: "#CBD5E1",
          busText: "#334155",
          waitFill: "#FEF3C7",
          waitText: "#92400E",
          jamFill: "#FEE2E2",
          jamText: "#B91C1C",
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
          busFill: "#334155",
          busText: "#CBD5E1",
          waitFill: "#78350F",
          waitText: "#FDE68A",
          jamFill: "#450A0A",
          jamText: "#FCA5A5",
          dataFill: "#172554",
          dataText: "#BFDBFE",
          okFill: "#052E2B",
          okText: "#A7F3D0",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#node-b"), { x: N.b.x, y: N.b.y })
    gsap.set(q("#node-c"), { x: N.c.x, y: N.c.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-a"), { x: BUS_POINTS.a.x, y: BUS_POINTS.a.y, opacity: 0 })
    gsap.set(q("#pkt-b"), { x: BUS_POINTS.b.x, y: BUS_POINTS.b.y, opacity: 0 })
    gsap.set(q("#pkt-ok"), { x: BUS_POINTS.a.x, y: BUS_POINTS.a.y, opacity: 0 })
    gsap.set(q("#jam-left, #jam-right"), { x: N.collision.x, y: N.collision.y, opacity: 0 })
    gsap.set(q("#intro-card, #collision-card, #retry-card, #success-card, #backoff-a, #backoff-b"), { opacity: 0, y: 8 })
    gsap.set(q("#collision-wave"), { opacity: 0, scale: 0.55, transformOrigin: "50% 50%" })
    gsap.set(q("#bus-core"), { stroke: C.idle, strokeWidth: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-a .node-circle"), { stroke: C.warn, strokeWidth: 2.6, duration: 0.28 })
      .to(q("#node-b .node-circle"), { stroke: C.active, strokeWidth: 2.2, duration: 0.22 }, "<0.08")
      .to(q("#intro-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.04")
      .to(q("#bus-core"), { stroke: C.active, duration: 0.28 }, "<")

    tl.addLabel("step-2")
      .to(q("#pkt-a"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-b"), { opacity: 1, duration: 0.05 }, "<0.04")
      .to(q("#pkt-a"), { x: N.collision.x, y: N.collision.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-b"), { x: N.collision.x, y: N.collision.y, duration: 0.7, ease: "power2.inOut" }, "<")
      .to(q("#node-a .node-circle"), { stroke: C.active, duration: 0.16 }, "<0.08")
      .to(q("#node-b .node-circle"), { stroke: C.active, duration: 0.16 }, "<")

    tl.addLabel("step-3")
      .to(q("#pkt-a, #pkt-b"), { opacity: 0.1, duration: 0.08 })
      .to(q("#collision-wave"), { opacity: 1, scale: 1.5, duration: 0.38, ease: "power2.out" }, "<")
      .to(q("#bus-core"), { stroke: C.danger, duration: 0.12 }, "<0.02")
      .to(q("#collision-card"), { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" }, "<0.08")
      .to(q("#node-a .node-circle, #node-b .node-circle"), { stroke: C.danger, strokeWidth: 2.8, duration: 0.18 }, "<0.04")

    tl.addLabel("step-4")
      .to(q("#pkt-a, #pkt-b"), { opacity: 0, duration: 0.05 })
      .to(q("#jam-left"), { opacity: 1, duration: 0.04 }, "<")
      .to(q("#jam-right"), { opacity: 1, duration: 0.04 }, "<")
      .to(q("#jam-left"), { x: BUS_POINTS.a.x, y: BUS_POINTS.a.y, duration: 0.42, ease: "power2.out" })
      .to(q("#jam-right"), { x: BUS_POINTS.c.x, y: BUS_POINTS.c.y, duration: 0.42, ease: "power2.out" }, "<")
      .to(q("#retry-card"), { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" }, "<0.08")
      .to(q("#backoff-a"), { opacity: 1, y: 0, duration: 0.22 }, "<0.02")
      .to(q("#backoff-b"), { opacity: 1, y: 0, duration: 0.22 }, "<0.04")
      .to(q("#backoff-a"), { opacity: 0.85, repeat: 1, yoyo: true, duration: 0.24 })
      .to(q("#backoff-b"), { opacity: 0.85, repeat: 2, yoyo: true, duration: 0.24 }, "<")
      .to(q("#jam-left, #jam-right"), { opacity: 0, duration: 0.08 }, "<0.12")
      .to(q("#collision-wave"), { opacity: 0, duration: 0.12 }, "<")
      .to(q("#bus-core"), { stroke: C.warn, duration: 0.16 }, "<")

    tl.addLabel("step-5")
      .to(q("#backoff-a, #backoff-b"), { opacity: 0, duration: 0.08 })
      .to(q("#pkt-ok"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#pkt-ok"), { x: BUS_POINTS.c.x, y: BUS_POINTS.c.y, duration: 0.94, ease: "power2.inOut" })
      .to(q("#pkt-ok"), { opacity: 0, duration: 0.06 })
      .to(q("#node-a .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.18 }, "<0.02")
      .to(q("#node-c .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.18 }, "<0.08")
      .to(q("#node-b .node-circle"), { stroke: C.idle, strokeWidth: 1.5, duration: 0.18 }, "<")
      .to(q("#success-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" }, "<0.08")
      .to(q("#bus-core"), { stroke: C.success, duration: 0.2 }, "<")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.danger, C.idle, C.success, C.warn, registerTimeline])

  const activeInfo = selectedNode ? NODE_INFO[selectedNode] : null
  const activeAnchor = selectedNode
    ? TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS]
    : null

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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text x="400" y="36" textAnchor="middle" fill={C.subText} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
          CSMA/CD EN ETHERNET HALF-DUPLEX: ESCUCHAR, COLISIONAR, ESPERAR Y REINTENTAR
        </text>

        <line x1="96" y1={BUS_Y} x2="704" y2={BUS_Y} stroke={C.busFill} strokeWidth="16" strokeLinecap="round" opacity="0.18" />
        <line id="bus-core" x1="96" y1={BUS_Y} x2="704" y2={BUS_Y} stroke={C.idle} strokeWidth="8" strokeLinecap="round" />

        <line x1={N.a.x} y1={N.a.y} x2={BUS_POINTS.a.x} y2={BUS_POINTS.a.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="5 4" />
        <line x1={N.b.x} y1={N.b.y} x2={BUS_POINTS.b.x} y2={BUS_POINTS.b.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="5 4" />
        <line x1={N.c.x} y1={N.c.y} x2={BUS_POINTS.c.x} y2={BUS_POINTS.c.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="5 4" />

        <g id="node-a" onMouseEnter={() => handleNodeEnter("a")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC A
          </text>
        </g>

        <g id="node-b" onMouseEnter={() => handleNodeEnter("b")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC B
          </text>
        </g>

        <g id="node-c" onMouseEnter={() => handleNodeEnter("c")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC C
          </text>
        </g>

        <g id="intro-card" pointerEvents="none">
          <rect x="180" y="58" width="440" height="46" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="76" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            MEDIO COMPARTIDO
          </text>
          <text x="400" y="91" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Todos escuchan el mismo canal antes de transmitir
          </text>
        </g>

        <g id="collision-card" pointerEvents="none">
          <rect x="266" y="308" width="268" height="42" rx="12" fill={C.panel} stroke={C.danger} strokeWidth="1.4" />
          <text x="400" y="325" textAnchor="middle" fill={C.danger} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            COLISION
          </text>
          <text x="400" y="339" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Las tramas se pisan y ninguna llega válida
          </text>
        </g>

        <g id="retry-card" pointerEvents="none">
          <rect x="214" y="356" width="372" height="42" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="373" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            JAM + BACKOFF ALEATORIO
          </text>
          <text x="400" y="387" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Cada emisor espera distinto antes de volver a probar
          </text>
        </g>

        <g id="success-card" pointerEvents="none">
          <rect x="182" y="404" width="436" height="38" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="427" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            EL REINTENTO GANA PORQUE YA NO COINCIDEN LOS TIEMPOS
          </text>
        </g>

        <g id="backoff-a" pointerEvents="none">
          <rect x="74" y="186" width="112" height="24" rx="12" fill={C.waitFill} />
          <text x="130" y="201" textAnchor="middle" fill={C.waitText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            A espera 1 slot
          </text>
        </g>

        <g id="backoff-b" pointerEvents="none">
          <rect x="344" y="186" width="112" height="24" rx="12" fill={C.waitFill} />
          <text x="400" y="201" textAnchor="middle" fill={C.waitText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            B espera 3 slots
          </text>
        </g>

        <g id="collision-wave" pointerEvents="none" transform={`translate(${N.collision.x} ${N.collision.y})`}>
          <circle r="18" fill={C.jamFill} opacity="0.7" />
          <circle r="34" fill="none" stroke={C.danger} strokeWidth="2" strokeDasharray="6 4" />
          <text textAnchor="middle" y="4" fill={C.jamText} fontSize="18" fontWeight="900" fontFamily="var(--font-mono)">
            X
          </text>
        </g>

        <g id="pkt-a" pointerEvents="none">
          <PacketPill label="TRAMA A" fill={C.dataFill} textColor={C.dataText} width={88} />
        </g>

        <g id="pkt-b" pointerEvents="none">
          <PacketPill label="TRAMA B" fill={C.dataFill} textColor={C.dataText} width={88} />
        </g>

        <g id="pkt-ok" pointerEvents="none">
          <PacketPill label="TRAMA OK" fill={C.okFill} textColor={C.okText} width={94} />
        </g>

        <g id="jam-left" pointerEvents="none">
          <PacketPill label="JAM" fill={C.jamFill} textColor={C.jamText} width={62} />
        </g>

        <g id="jam-right" pointerEvents="none">
          <PacketPill label="JAM" fill={C.jamFill} textColor={C.jamText} width={62} />
        </g>

        <text x="400" y="294" textAnchor="middle" fill={C.busText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          MEDIO COMPARTIDO
        </text>
      </svg>
    </div>
  )
}
