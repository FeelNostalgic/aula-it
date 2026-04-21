"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, SwitchGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"

const N = {
  sw: { x: 400, y: 92 },
  a: { x: 140, y: 340 },
  b: { x: 400, y: 340 },
  c: { x: 660, y: 340 },
} as const

const TOOLTIP_ANCHORS = {
  sw: { x: N.sw.x + NETWORK_DEVICE_STYLE.switch.radius, y: N.sw.y + NETWORK_DEVICE_STYLE.switch.radius },
  a: { x: N.a.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.a.y + NETWORK_DEVICE_STYLE.pc.radius },
  b: { x: N.b.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.b.y + NETWORK_DEVICE_STYLE.pc.radius },
  c: { x: N.c.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.c.y + NETWORK_DEVICE_STYLE.pc.radius },
} as const

const VIEWBOX = { width: 800, height: 460 }

const NODE_INFO: Record<string, NodeInfo> = {
  sw: {
    id: "sw",
    label: "Switch",
    facts: [
      { label: "rol", value: "Reenvia tramas por puerto" },
      { label: "busca", value: "MAC destino" },
    ],
    macTable: [
      { mac: "00:1A:2B:10:00:01", port: "Fa0/1" },
      { mac: "00:1A:2B:10:00:02", port: "Fa0/2" },
      { mac: "00:1A:2B:10:00:03", port: "Fa0/3" },
    ],
  },
  a: {
    id: "a",
    label: "PC A",
    ip: "192.168.1.10",
    mask: "24",
    mac: "00:1A:2B:10:00:01",
    gateway: "192.168.1.1",
    facts: [
      { label: "nic", value: "eth0" },
      { label: "tipo", value: "Construye la trama" },
    ],
  },
  b: {
    id: "b",
    label: "PC B",
    ip: "192.168.1.20",
    mask: "24",
    mac: "00:1A:2B:10:00:02",
    gateway: "192.168.1.1",
    facts: [
      { label: "nic", value: "eth0" },
      { label: "acepta", value: "MAC destino coincide" },
    ],
  },
  c: {
    id: "c",
    label: "PC C",
    ip: "192.168.1.30",
    mask: "24",
    mac: "00:1A:2B:10:00:03",
    gateway: "192.168.1.1",
    facts: [
      { label: "nic", value: "eth0" },
      { label: "ignora", value: "La trama no va para el" },
    ],
  },
}

export function EthernetAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const C =
    resolvedTheme === "light"
      ? {
          idle: "#94A3B8",
          active: "#2563EB",
          success: "#059669",
          warn: "#D97706",
          muted: "#CBD5E1",
          fg: "#0F172A",
          bg: "#E5EAF0",
          panel: "#FFFFFF",
          subText: "#475569",
          warnText: "#111827",
          successText: "#F8FAFC",
        }
      : {
          idle: "#64748B",
          active: "#38BDF8",
          success: "#34D399",
          warn: "#FBBF24",
          muted: "#334155",
          fg: "#E5E7EB",
          bg: "#1F2937",
          panel: "#111827",
          subText: "#A3B0C2",
          warnText: "#111827",
          successText: "#F8FAFC",
        }

  const handleNodeEnter = (id: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setSelectedNode(id)
  }

  const scheduleHide = () => {
    hideTimer.current = setTimeout(() => setSelectedNode(null), 180)
  }

  const cancelHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-sw"), { x: N.sw.x, y: N.sw.y })
    gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#node-b"), { x: N.b.x, y: N.b.y })
    gsap.set(q("#node-c"), { x: N.c.x, y: N.c.y })

    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q(".packet"), { opacity: 0 })
    gsap.set(q("#pkt-up"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#pkt-b"), { x: N.sw.x, y: N.sw.y })
    gsap.set(q("#frame-card, #switch-decision"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-a .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#node-a .pulse"), {
        scale: 1.5,
        opacity: 0.55,
        repeat: 2,
        yoyo: true,
        duration: 0.45,
        ease: "power1.inOut",
        transformOrigin: "50% 50%",
      }, "<")

    tl.addLabel("step-2")
      .to(q("#frame-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.3)" })
      .to(q("#node-a .node-circle"), { stroke: C.active, duration: 0.2 }, "<0.05")

    tl.addLabel("step-3")
      .to(q("#pkt-up"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-up"), { x: N.sw.x, y: N.sw.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-up"), { opacity: 0, duration: 0.05 })
      .to(q("#node-sw .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.25 }, "<")
      .to(q("#switch-decision"), { opacity: 1, y: 0, duration: 0.3 }, "<0.1")

    tl.addLabel("step-4")
      .to(q("#node-c"), { opacity: 0.38, duration: 0.25 })
      .to(q("#node-c .node-circle"), { stroke: C.idle, opacity: 0.35, duration: 0.25 }, "<")
      .to(q("#pkt-b"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-b"), { x: N.b.x, y: N.b.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-b"), { opacity: 0, duration: 0.05 })
      .to(q("#node-b .node-circle"), { stroke: C.active, strokeWidth: 2.5, duration: 0.25 }, "<0.05")

    tl.addLabel("step-5")
      .to(q("#node-a .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.3 })
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.3 }, "<")
      .to(q("#node-c"), { opacity: 1, duration: 0.2 }, "<")
      .to(q("#node-c .node-circle"), { stroke: C.idle, opacity: 1, duration: 0.2 }, "<")
      .to(q("#frame-card .accept"), { opacity: 1, duration: 0.2 }, "<0.05")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.idle, C.success, C.warn, registerTimeline])

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
        <line x1={N.a.x} y1={N.a.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={N.b.x} y1={N.b.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={N.c.x} y1={N.c.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />

        <g id="node-sw" onMouseEnter={() => handleNodeEnter("sw")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.switch.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <SwitchGlyph stroke={C.active} />
          <text y={NETWORK_DEVICE_STYLE.switch.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Switch
          </text>
        </g>

        <g id="node-a" onMouseEnter={() => handleNodeEnter("a")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="pulse" r={NETWORK_DEVICE_STYLE.pc.pulseRadius} fill="none" stroke={C.active} strokeWidth="1" opacity="0.15" />
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

        <g id="frame-card" pointerEvents="none">
          <rect x="52" y="214" width="198" height="66" rx="10" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="68" y="232" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA ETHERNET
          </text>
          <text x="68" y="247" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            MAC origen: 00:1A:2B:10:00:01
          </text>
          <text x="68" y="260" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            MAC destino: 00:1A:2B:10:00:02
          </text>
          <text x="68" y="273" fill={C.subText} fontSize="8.5" fontFamily="var(--font-mono)">
            EtherType: IPv4
          </text>
          <text className="accept" x="188" y="232" fill={C.success} opacity="0" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            ENTREGADA
          </text>
        </g>

        <g id="switch-decision" pointerEvents="none">
          <rect x="334" y="140" width="132" height="34" rx="8" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="154" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            MAC DESTINO
          </text>
          <text x="400" y="166" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Sale por Fa0/2
          </text>
        </g>

        <g id="pkt-up" className="packet" pointerEvents="none">
          <rect x="-34" y="-11" width="68" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fill={C.warnText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            ETH FRAME
          </text>
        </g>

        <g id="pkt-b" className="packet" pointerEvents="none">
          <rect x="-34" y="-11" width="68" height="22" rx="5" fill={C.success} />
          <text textAnchor="middle" y="4" fill={C.successText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            ETH FRAME
          </text>
        </g>
      </svg>
    </div>
  )
}
