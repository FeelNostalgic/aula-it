"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, RouterGlyph } from "./network-device-icons"
import { CloudGlyph, PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 }

const N = {
  src: { x: 118, y: 328 },
  gw: { x: 254, y: 180 },
  net: { x: 404, y: 126 },
  edge: { x: 544, y: 180 },
  dst: { x: 682, y: 328 },
} as const

const TOOLTIP_ANCHORS = {
  src: { x: N.src.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.src.y + NETWORK_DEVICE_STYLE.pc.radius },
  gw: { x: N.gw.x + NETWORK_DEVICE_STYLE.router.radius, y: N.gw.y + NETWORK_DEVICE_STYLE.router.radius },
  edge: { x: N.edge.x + NETWORK_DEVICE_STYLE.router.radius, y: N.edge.y + NETWORK_DEVICE_STYLE.router.radius },
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
      { label: "red", value: "192.168.1.0/24" },
      { label: "sale", value: "Usa su gateway" },
    ],
  },
  gw: {
    id: "gw",
    label: "Gateway",
    ip: "192.168.1.1",
    mask: "24",
    routingTable: [
      { dest: "0.0.0.0", mask: "0", gateway: "10.0.0.2", iface: "g0/1" },
      { dest: "192.168.1.0", mask: "24", gateway: "", iface: "g0/0" },
    ],
  },
  edge: {
    id: "edge",
    label: "Router borde",
    ip: "172.16.0.1",
    mask: "24",
    routingTable: [
      { dest: "172.16.0.0", mask: "24", gateway: "", iface: "g0/0" },
      { dest: "192.168.1.0", mask: "24", gateway: "10.0.0.1", iface: "g0/1" },
    ],
  },
  dst: {
    id: "dst",
    label: "Servidor B",
    ip: "172.16.0.20",
    mask: "24",
    gateway: "172.16.0.1",
    facts: [
      { label: "red", value: "172.16.0.0/24" },
      { label: "recibe", value: "Paquete de su red" },
    ],
  },
}

export function IpRouteAnimation() {
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
          lanFill: "#F8FAFC",
          lanStroke: "#CBD5E1",
          cloudFill: "#E0F2FE",
          cloudStroke: "#0284C7",
          packet: "#0F172A",
          packetText: "#F8FAFC",
          badgeFill: "#DBEAFE",
          badgeText: "#1D4ED8",
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
          lanFill: "#0F172A",
          lanStroke: "#334155",
          cloudFill: "#0C4A6E",
          cloudStroke: "#38BDF8",
          packet: "#E2E8F0",
          packetText: "#0F172A",
          badgeFill: "#172554",
          badgeText: "#BFDBFE",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-src"), { x: N.src.x, y: N.src.y })
    gsap.set(q("#node-gw"), { x: N.gw.x, y: N.gw.y })
    gsap.set(q("#node-net"), { x: N.net.x, y: N.net.y })
    gsap.set(q("#node-edge"), { x: N.edge.x, y: N.edge.y })
    gsap.set(q("#node-dst"), { x: N.dst.x, y: N.dst.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q("#pkt-ip"), { x: N.src.x, y: N.src.y, opacity: 0 })
    gsap.set(q("#gateway-card, #route-card, #arrival-card"), { opacity: 0, y: 8 })
    gsap.set(q("#left-lan, #right-lan"), { stroke: C.lanStroke, opacity: 0.75 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#left-lan"), { stroke: C.warn, opacity: 1, duration: 0.3 })
      .to(q("#right-lan"), { stroke: C.active, opacity: 1, duration: 0.3 }, "<")
      .to(q("#node-src .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.25 }, "<")

    tl.addLabel("step-2")
      .to(q("#pkt-ip"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-ip"), { x: N.gw.x, y: N.gw.y, duration: 0.65, ease: "power2.inOut" })
      .to(q("#gateway-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.1")
      .to(q("#node-gw .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.25 }, "<")

    tl.addLabel("step-3")
      .to(q("#pkt-ip"), { x: N.net.x, y: N.net.y + 16, duration: 0.7, ease: "power2.inOut" })
      .to(q("#route-card"), { opacity: 1, y: 0, duration: 0.3 }, "<0.08")
      .to(q("#node-net .cloud-shape"), { opacity: 1, strokeWidth: 2.2, duration: 0.25 }, "<")

    tl.addLabel("step-4")
      .to(q("#pkt-ip"), { x: N.edge.x, y: N.edge.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#node-edge .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.25 }, "<0.35")

    tl.addLabel("step-5")
      .to(q("#pkt-ip"), { x: N.dst.x, y: N.dst.y, duration: 0.65, ease: "power2.inOut" })
      .to(q("#pkt-ip"), { opacity: 0, duration: 0.12 })
      .to(q("#node-dst .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.25 }, "<0.02")
      .to(q("#arrival-card"), { opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }, "<0.08")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.lanStroke, C.success, C.warn, registerTimeline])

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
        <rect id="left-lan" x="40" y="265" width="270" height="188" rx="24" fill={C.lanFill} stroke={C.lanStroke} strokeWidth="1.4" />
        <rect id="right-lan" x="492" y="265" width="270" height="188" rx="24" fill={C.lanFill} stroke={C.lanStroke} strokeWidth="1.4" />
        <text x="176" y="430" textAnchor="middle" fill={C.subText} fontSize="9.25" fontWeight="700" fontFamily="var(--font-mono)">
          RED ORIGEN 192.168.1.0/24
        </text>
        <text x="626" y="430" textAnchor="middle" fill={C.subText} fontSize="9.25" fontWeight="700" fontFamily="var(--font-mono)">
          RED DESTINO 172.16.0.0/24
        </text>

        <line x1={N.src.x} y1={N.src.y} x2={N.gw.x} y2={N.gw.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.gw.x} y1={N.gw.y} x2={N.net.x - 92} y2={N.net.y + 14} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.net.x + 92} y1={N.net.y + 14} x2={N.edge.x} y2={N.edge.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
        <line x1={N.edge.x} y1={N.edge.y} x2={N.dst.x} y2={N.dst.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

        <g id="node-src" onMouseEnter={() => handleNodeEnter("src")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            PC A
          </text>
        </g>

        <g id="node-gw" onMouseEnter={() => handleNodeEnter("gw")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y="60" textAnchor="middle" fill={C.fg} fontSize="10.75" fontWeight="600" fontFamily="var(--font-mono)">
            Gateway
          </text>
        </g>

        <g id="node-net" pointerEvents="none">
          <CloudGlyph className="cloud-shape" fill={C.cloudFill} stroke={C.cloudStroke} />
          <text y="-8" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
            RED WAN
          </text>
          <text y="12" textAnchor="middle" fill={C.subText} fontSize="8.5" fontFamily="var(--font-mono)">
            Pasa entre redes
          </text>
        </g>

        <g id="node-edge" onMouseEnter={() => handleNodeEnter("edge")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y="60" textAnchor="middle" fill={C.fg} fontSize="10.75" fontWeight="600" fontFamily="var(--font-mono)">
            Router borde
          </text>
        </g>

        <g id="node-dst" onMouseEnter={() => handleNodeEnter("dst")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Servidor B
          </text>
        </g>

        <g id="gateway-card" pointerEvents="none">
          <rect x="150" y="82" width="208" height="44" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="254" y="99" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            DESTINO FUERA DE MI RED
          </text>
          <text x="254" y="113" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El paquete sale por el gateway
          </text>
        </g>

        <g id="route-card" pointerEvents="none">
          <rect x="268" y="248" width="272" height="48" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="404" y="267" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            BUSCANDO RED 172.16.0.0/24
          </text>
          <text x="404" y="281" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            La WAN lo acerca al router correcto
          </text>
        </g>

        <g id="arrival-card" pointerEvents="none">
          <rect x="510" y="80" width="232" height="44" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="626" y="97" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            ULTIMO SALTO HASTA SU RED
          </text>
          <text x="626" y="111" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El host final ya puede recibirlo
          </text>
        </g>

        <g id="pkt-ip" pointerEvents="none">
          <PacketPill label="PAQ IP" fill={C.packet} textColor={C.packetText} />
        </g>
      </svg>
    </div>
  )
}
