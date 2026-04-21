"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, RouterGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"

const N = {
  left: { x: 180, y: 230 },
  right: { x: 620, y: 230 },
} as const

const TOOLTIP_ANCHORS = {
  left: { x: N.left.x + NETWORK_DEVICE_STYLE.router.radius, y: N.left.y + NETWORK_DEVICE_STYLE.router.radius },
  right: { x: N.right.x + NETWORK_DEVICE_STYLE.router.radius, y: N.right.y + NETWORK_DEVICE_STYLE.router.radius },
} as const

const VIEWBOX = { width: 800, height: 460 }

const NODE_INFO: Record<string, NodeInfo> = {
  left: {
    id: "left",
    label: "Router A",
    ip: "10.0.0.1",
    mask: "30",
    facts: [
      { label: "if", value: "s0/0" },
      { label: "enlace", value: "PPP activo" },
      { label: "encap", value: "PPP" },
    ],
  },
  right: {
    id: "right",
    label: "Router B",
    ip: "10.0.0.2",
    mask: "30",
    facts: [
      { label: "if", value: "s0/0" },
      { label: "enlace", value: "PPP activo" },
      { label: "recibe", value: "Trama directa" },
    ],
  },
}

export function PppAnimation() {
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
          fg: "#0F172A",
          bg: "#E5EAF0",
          panel: "#FFFFFF",
          subText: "#475569",
          warnText: "#111827",
          successText: "#F8FAFC",
          link: "#7C3AED",
          linkFill: "#F3E8FF",
        }
      : {
          idle: "#64748B",
          active: "#38BDF8",
          success: "#34D399",
          warn: "#FBBF24",
          fg: "#E5E7EB",
          bg: "#1F2937",
          panel: "#111827",
          subText: "#A3B0C2",
          warnText: "#111827",
          successText: "#F8FAFC",
          link: "#C084FC",
          linkFill: "#2E1065",
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

    gsap.set(q("#node-left"), { x: N.left.x, y: N.left.y })
    gsap.set(q("#node-right"), { x: N.right.x, y: N.right.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })
    gsap.set(q(".packet"), { opacity: 0 })
    gsap.set(q("#pkt-lcp-a"), { x: N.left.x, y: N.left.y })
    gsap.set(q("#pkt-lcp-b"), { x: N.right.x, y: N.right.y })
    gsap.set(q("#pkt-ppp"), { x: N.left.x, y: N.left.y })
    gsap.set(q("#link-status, #frame-card, #accept-card"), { opacity: 0, y: 8 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#node-left .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#node-right .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 }, "<")

    tl.addLabel("step-2")
      .to(q("#pkt-lcp-a"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-lcp-a"), { x: N.right.x, y: N.right.y, duration: 0.6, ease: "power2.inOut" })
      .to(q("#pkt-lcp-a"), { opacity: 0, duration: 0.05 })
      .to(q("#pkt-lcp-b"), { opacity: 1, duration: 0.05 }, "<0.05")
      .to(q("#pkt-lcp-b"), { x: N.left.x, y: N.left.y, duration: 0.6, ease: "power2.inOut" })
      .to(q("#pkt-lcp-b"), { opacity: 0, duration: 0.05 })
      .to(q("#link-status"), { opacity: 1, y: 0, duration: 0.3 }, "<0.05")
      .to(q("#node-left .node-circle"), { stroke: C.active, duration: 0.2 }, "<")
      .to(q("#node-right .node-circle"), { stroke: C.active, duration: 0.2 }, "<")

    tl.addLabel("step-3")
      .to(q("#frame-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.3)" })

    tl.addLabel("step-4")
      .to(q("#pkt-ppp"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-ppp"), { x: N.right.x, y: N.right.y, duration: 0.9, ease: "power2.inOut" })
      .to(q("#pkt-ppp"), { opacity: 0, duration: 0.05 })
      .to(q("#beam"), { opacity: 0.95, duration: 0.2 }, "<0.1")
      .to(q("#node-right .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.25 }, "<0.45")

    tl.addLabel("step-5")
      .to(q("#accept-card"), { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.3)" })
      .to(q("#node-left .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.3 }, "<0.05")

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
        <line x1={N.left.x} y1={N.left.y} x2={N.right.x} y2={N.right.y} stroke={C.link} strokeWidth="3" strokeDasharray="8 6" opacity="0.55" />
        <line id="beam" x1={N.left.x} y1={N.left.y} x2={N.right.x} y2={N.right.y} stroke={C.active} strokeWidth="5" opacity="0.1" pointerEvents="none" />

        <g id="node-left" onMouseEnter={() => handleNodeEnter("left")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Router A
          </text>
        </g>

        <g id="node-right" onMouseEnter={() => handleNodeEnter("right")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <RouterGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
            Router B
          </text>
        </g>

        <g id="link-status" pointerEvents="none">
          <rect x="302" y="72" width="196" height="44" rx="10" fill={C.panel} stroke={C.link} strokeWidth="1.4" />
          <text x="400" y="89" textAnchor="middle" fill={C.link} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            ENLACE PPP ESTABLECIDO
          </text>
          <text x="400" y="103" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            LCP OK - dos extremos, un solo camino
          </text>
        </g>

        <g id="frame-card" pointerEvents="none">
          <rect x="94" y="100" width="178" height="64" rx="10" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="110" y="118" fill={C.active} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            TRAMA PPP
          </text>
          <text x="110" y="132" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Flag | Address | Control
          </text>
          <text x="110" y="145" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            Protocol | Datos | FCS
          </text>
          <text x="110" y="158" fill={C.subText} fontSize="8.5" fontFamily="var(--font-mono)">
            Sin switch ni MAC destino
          </text>
        </g>

        <g id="accept-card" pointerEvents="none">
          <rect x="518" y="102" width="190" height="52" rx="10" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="613" y="120" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            DESENCAPSULACIÓN
          </text>
          <text x="613" y="136" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            El receptor quita la cabecera PPP
          </text>
        </g>

        <g id="pkt-lcp-a" className="packet" pointerEvents="none">
          <rect x="-22" y="-10" width="44" height="20" rx="4" fill={C.warn} />
          <text textAnchor="middle" y="4" fill={C.warnText} fontSize="8" fontWeight="700" fontFamily="var(--font-mono)">
            LCP
          </text>
        </g>

        <g id="pkt-lcp-b" className="packet" pointerEvents="none">
          <rect x="-22" y="-10" width="44" height="20" rx="4" fill={C.warn} />
          <text textAnchor="middle" y="4" fill={C.warnText} fontSize="8" fontWeight="700" fontFamily="var(--font-mono)">
            ACK
          </text>
        </g>

        <g id="pkt-ppp" className="packet" pointerEvents="none">
          <rect x="-34" y="-11" width="68" height="22" rx="5" fill={C.success} />
          <text textAnchor="middle" y="4" fill={C.successText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
            PPP FRAME
          </text>
        </g>
      </svg>
    </div>
  )
}
