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
  src: { x: 82, y: 232 },
  r1: { x: 228, y: 148 },
  r2: { x: 400, y: 232 },
  r3: { x: 572, y: 148 },
  dst: { x: 718, y: 232 },
} as const

const TOOLTIP_ANCHORS = {
  src: { x: N.src.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.src.y + NETWORK_DEVICE_STYLE.pc.radius },
  r1: { x: N.r1.x + NETWORK_DEVICE_STYLE.router.radius, y: N.r1.y + NETWORK_DEVICE_STYLE.router.radius },
  r2: { x: N.r2.x + NETWORK_DEVICE_STYLE.router.radius, y: N.r2.y + NETWORK_DEVICE_STYLE.router.radius },
  r3: { x: N.r3.x + NETWORK_DEVICE_STYLE.router.radius, y: N.r3.y + NETWORK_DEVICE_STYLE.router.radius },
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
      { label: "envia", value: "Paquete IP" },
      { label: "dest", value: "172.16.0.20" },
    ],
  },
  r1: {
    id: "r1",
    label: "Router 1",
    routingTable: [
      { dest: "172.16.0.0", mask: "24", gateway: "10.0.12.2", iface: "s0/0" },
      { dest: "0.0.0.0", mask: "0", gateway: "10.0.12.2", iface: "s0/0" },
    ],
  },
  r2: {
    id: "r2",
    label: "Router 2",
    routingTable: [
      { dest: "172.16.0.0", mask: "24", gateway: "10.0.23.2", iface: "s0/1" },
      { dest: "192.168.1.0", mask: "24", gateway: "10.0.12.1", iface: "s0/0" },
    ],
  },
  r3: {
    id: "r3",
    label: "Router 3",
    routingTable: [
      { dest: "172.16.0.0", mask: "24", gateway: "", iface: "g0/0" },
      { dest: "192.168.1.0", mask: "24", gateway: "10.0.23.1", iface: "s0/1" },
    ],
  },
  dst: {
    id: "dst",
    label: "Servidor B",
    ip: "172.16.0.20",
    mask: "24",
    gateway: "172.16.0.1",
    facts: [
      { label: "rol", value: "Red final" },
      { label: "recibe", value: "Paquete del ultimo salto" },
    ],
  },
}

export function IpHopByHopAnimation() {
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
          packet: "#0F172A",
          packetText: "#F8FAFC",
          noteFill: "#DBEAFE",
          noteText: "#1D4ED8",
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
          packet: "#E2E8F0",
          packetText: "#0F172A",
          noteFill: "#172554",
          noteText: "#BFDBFE",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-src"), { x: N.src.x, y: N.src.y })
    gsap.set(q("#node-r1"), { x: N.r1.x, y: N.r1.y })
    gsap.set(q("#node-r2"), { x: N.r2.x, y: N.r2.y })
    gsap.set(q("#node-r3"), { x: N.r3.x, y: N.r3.y })
    gsap.set(q("#node-dst"), { x: N.dst.x, y: N.dst.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-ip"), { x: N.src.x, y: N.src.y, opacity: 0 })
    gsap.set(q(".hop-note, #summary-card"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-src .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.25 })
      .to(q("#pkt-ip"), { opacity: 1, duration: 0.05 }, "<0.02")
      .to(q("#pkt-ip"), { x: N.r1.x, y: N.r1.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#hop-note-1"), { opacity: 1, y: 0, duration: 0.28 }, "<0.1")
      .to(q("#node-r1 .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<")

    tl.addLabel("step-2")
      .to(q("#pkt-ip"), { x: N.r2.x, y: N.r2.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#hop-note-2"), { opacity: 1, y: 0, duration: 0.28 }, "<0.1")
      .to(q("#node-r2 .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<0.3")

    tl.addLabel("step-3")
      .to(q("#pkt-ip"), { x: N.r3.x, y: N.r3.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#hop-note-3"), { opacity: 1, y: 0, duration: 0.28 }, "<0.1")
      .to(q("#node-r3 .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.2 }, "<0.3")

    tl.addLabel("step-4")
      .to(q("#pkt-ip"), { x: N.dst.x, y: N.dst.y, duration: 0.72, ease: "power2.inOut" })
      .to(q("#hop-note-4"), { opacity: 1, y: 0, duration: 0.28 }, "<0.1")
      .to(q("#node-dst .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.22 }, "<0.36")

    tl.addLabel("step-5")
      .to(q("#pkt-ip"), { opacity: 0, duration: 0.14 })
      .to(q("#summary-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.05")

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
        <line x1={N.r2.x} y1={N.r2.y} x2={N.r3.x} y2={N.r3.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.r3.x} y1={N.r3.y} x2={N.dst.x} y2={N.dst.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

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

        <g id="node-r3" onMouseEnter={() => handleNodeEnter("r3")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
            Router 3
          </text>
        </g>

        <g id="node-dst" onMouseEnter={() => handleNodeEnter("dst")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Servidor B
          </text>
        </g>

        <g id="hop-note-1" className="hop-note" pointerEvents="none">
          <rect x="82" y="60" width="292" height="26" rx="13" fill={C.noteFill} />
          <text x="228" y="76" textAnchor="middle" fill={C.noteText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            Router 1 decide el siguiente salto
          </text>
        </g>

        <g id="hop-note-2" className="hop-note" pointerEvents="none">
          <rect x="286" y="298" width="228" height="26" rx="13" fill={C.noteFill} />
          <text x="400" y="314" textAnchor="middle" fill={C.noteText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            Router 2 lo reenvia mas cerca
          </text>
        </g>

        <g id="hop-note-3" className="hop-note" pointerEvents="none">
          <rect x="454" y="60" width="236" height="26" rx="13" fill={C.noteFill} />
          <text x="572" y="76" textAnchor="middle" fill={C.noteText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            Router 3 ve la red de destino
          </text>
        </g>

        <g id="hop-note-4" className="hop-note" pointerEvents="none">
          <rect x="528" y="290" width="256" height="26" rx="13" fill={C.noteFill} />
          <text x="656" y="306" textAnchor="middle" fill={C.noteText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            Ultimo salto a la red final
          </text>
        </g>

        <g id="summary-card" pointerEvents="none">
          <rect x="246" y="370" width="308" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="388" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            IP AVANZA SALTO A SALTO ENTRE ROUTERS
          </text>
          <text x="400" y="402" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Cada router reenvia el mismo paquete hacia el siguiente hop
          </text>
        </g>

        <g id="pkt-ip" pointerEvents="none">
          <PacketPill label="PAQ IP" fill={C.packet} textColor={C.packetText} />
        </g>
      </svg>
    </div>
  )
}
