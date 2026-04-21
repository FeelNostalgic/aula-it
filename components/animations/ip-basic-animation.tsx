"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph } from "./network-device-icons"
import { CloudGlyph, PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 }

const N = {
  src: { x: 124, y: 318 },
  net: { x: 404, y: 176 },
  dst: { x: 676, y: 136 },
} as const

const TOOLTIP_ANCHORS = {
  src: { x: N.src.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.src.y + NETWORK_DEVICE_STYLE.pc.radius },
  net: { x: N.net.x + 76, y: N.net.y + 42 },
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
      { label: "rol", value: "Host origen" },
      { label: "envia", value: "Paquete con IP destino" },
    ],
  },
  net: {
    id: "net",
    label: "Red IP",
    facts: [
      { label: "mision", value: "Llevar el paquete" },
      { label: "usa", value: "Direccion IP destino" },
    ],
  },
  dst: {
    id: "dst",
    label: "Servidor B",
    ip: "172.16.0.20",
    mask: "24",
    facts: [
      { label: "rol", value: "Host destino" },
      { label: "recibe", value: "Paquete dirigido a su IP" },
    ],
  },
}

export function IpBasicAnimation() {
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
          cloudFill: "#E0F2FE",
          cloudStroke: "#0284C7",
          packet: "#0F172A",
          packetText: "#F8FAFC",
          chipFill: "#DBEAFE",
          chipText: "#1D4ED8",
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
          cloudFill: "#0C4A6E",
          cloudStroke: "#38BDF8",
          packet: "#E2E8F0",
          packetText: "#0F172A",
          chipFill: "#172554",
          chipText: "#BFDBFE",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-src"), { x: N.src.x, y: N.src.y })
    gsap.set(q("#node-net"), { x: N.net.x, y: N.net.y })
    gsap.set(q("#node-dst"), { x: N.dst.x, y: N.dst.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-ip"), { x: N.src.x, y: N.src.y, opacity: 0 })
    gsap.set(q("#src-chip, #dst-chip, #route-card, #arrival-card"), { opacity: 0, y: 8 })
    gsap.set(q("#node-net .cloud-shape"), { stroke: C.cloudStroke, opacity: 0.7 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-src .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#node-src .pulse"), {
        scale: 1.55,
        opacity: 0.55,
        repeat: 2,
        yoyo: true,
        duration: 0.45,
        ease: "power1.inOut",
        transformOrigin: "50% 50%",
      }, "<")

    tl.addLabel("step-2")
      .to(q("#src-chip"), { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" })
      .to(q("#dst-chip"), { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" }, "<0.08")
      .to(q("#node-dst .node-circle"), { stroke: C.active, duration: 0.2 }, "<")

    tl.addLabel("step-3")
      .to(q("#pkt-ip"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-ip"), { x: N.net.x, y: N.net.y + 4, duration: 0.8, ease: "power2.inOut" })
      .to(q("#route-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.12")
      .to(q("#node-net .cloud-shape"), { opacity: 1, strokeWidth: 2.2, duration: 0.25 }, "<")

    tl.addLabel("step-4")
      .to(q("#pkt-ip"), { x: N.dst.x, y: N.dst.y, duration: 0.9, ease: "power2.inOut" })
      .to(q("#node-dst .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.25 }, "<0.45")

    tl.addLabel("step-5")
      .to(q("#pkt-ip"), { opacity: 0, duration: 0.15 })
      .to(q("#arrival-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }, "<0.05")
      .to(q("#node-src .node-circle"), { stroke: C.active, duration: 0.2 }, "<")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.cloudStroke, C.idle, C.success, C.warn, registerTimeline])

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
        <line x1={N.src.x} y1={N.src.y} x2={N.net.x - 86} y2={N.net.y + 20} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.net.x + 86} y1={N.net.y + 14} x2={N.dst.x} y2={N.dst.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <g id="node-src" onMouseEnter={() => handleNodeEnter("src")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="pulse" r={NETWORK_DEVICE_STYLE.pc.pulseRadius} fill="none" stroke={C.active} strokeWidth="1" opacity="0.14" />
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC A
          </text>
        </g>

        <g id="node-net" onMouseEnter={() => handleNodeEnter("net")} onMouseLeave={scheduleHide} className="cursor-default">
          <CloudGlyph className="cloud-shape" fill={C.cloudFill} stroke={C.cloudStroke} />
          <text y="-2" textAnchor="middle" fill={C.fg} fontSize="14" fontWeight="700" fontFamily="var(--font-mono)">
            RED IP
          </text>
          <text y="16" textAnchor="middle" fill={C.subText} fontSize="9.5" fontFamily="var(--font-mono)">
            Encamina usando IP destino
          </text>
        </g>

        <g id="node-dst" onMouseEnter={() => handleNodeEnter("dst")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Servidor B
          </text>
        </g>

        <g id="src-chip" pointerEvents="none">
          <rect x="42" y="238" width="164" height="22" rx="11" fill={C.chipFill} />
          <text x="124" y="252" textAnchor="middle" fill={C.chipText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            IP ORIGEN: 192.168.1.10
          </text>
        </g>

        <g id="dst-chip" pointerEvents="none">
          <rect x="582" y="56" width="188" height="22" rx="11" fill={C.chipFill} />
          <text x="676" y="70" textAnchor="middle" fill={C.chipText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            IP DESTINO: 172.16.0.20
          </text>
        </g>

        <g id="route-card" pointerEvents="none">
          <rect x="244" y="262" width="320" height="56" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="404" y="281" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            EL PAQUETE LLEVA LA IP DESTINO
          </text>
          <text x="404" y="299" textAnchor="middle" fill={C.fg} fontSize="8.25" fontFamily="var(--font-mono)">
            La red usa ese dato para acercarlo al receptor
          </text>
        </g>

        <g id="arrival-card" pointerEvents="none">
          <rect x="528" y="224" width="200" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="628" y="242" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            IP IDENTIFICA EL DESTINO LOGICO
          </text>
          <text x="628" y="256" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El paquete acaba en el host correcto
          </text>
        </g>

        <g id="pkt-ip" pointerEvents="none">
          <PacketPill label="PAQ IP" fill={C.packet} textColor={C.packetText} />
        </g>
      </svg>
    </div>
  )
}
