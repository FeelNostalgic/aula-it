"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, SwitchGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { PacketPill } from "./network-visual-primitives"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 } as const

const N = {
  sta: { x: 134, y: 270 },
  ap: { x: 400, y: 180 },
  lan: { x: 646, y: 270 },
} as const

const TOOLTIP_ANCHORS = {
  sta: { x: N.sta.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.sta.y + NETWORK_DEVICE_STYLE.pc.radius },
  ap: { x: N.ap.x + NETWORK_DEVICE_STYLE.router.radius, y: N.ap.y + NETWORK_DEVICE_STYLE.router.radius },
  lan: { x: N.lan.x + NETWORK_DEVICE_STYLE.switch.radius, y: N.lan.y + NETWORK_DEVICE_STYLE.switch.radius },
} as const

const NODE_INFO: Record<string, NodeInfo> = {
  sta: {
    id: "sta",
    label: "Estacion Wi-Fi",
    facts: [
      { label: "rol", value: "Cliente inalambrico" },
      { label: "medio", value: "Radio compartida" },
    ],
  },
  ap: {
    id: "ap",
    label: "Access Point",
    facts: [
      { label: "rol", value: "Puente entre Wi-Fi y LAN" },
      { label: "beacon", value: "Anuncia la red" },
    ],
  },
  lan: {
    id: "lan",
    label: "Red cableada",
    facts: [
      { label: "recibe", value: "Trafico reenviado por el AP" },
      { label: "formato", value: "Normalmente Ethernet" },
    ],
  },
}

function RadioGlyph({ stroke }: { stroke: string }) {
  return (
    <>
      <circle r="8" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M -22 -2 C -12 -16 12 -16 22 -2" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M -30 -10 C -14 -32 14 -32 30 -10" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="8" x2="0" y2="22" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  )
}

export function WifiAnimation() {
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
          panel: "#FFFFFF",
          subText: "#475569",
          radioFill: "#DBEAFE",
          dataFill: "#DCFCE7",
          dataText: "#047857",
          warnText: "#111827",
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
          radioFill: "#172554",
          dataFill: "#052E2B",
          dataText: "#A7F3D0",
          warnText: "#111827",
        }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#node-sta"), { x: N.sta.x, y: N.sta.y })
    gsap.set(q("#node-ap"), { x: N.ap.x, y: N.ap.y })
    gsap.set(q("#node-lan"), { x: N.lan.x, y: N.lan.y })
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5 })
    gsap.set(q(".packet"), { opacity: 0 })
    gsap.set(q("#beacon"), { x: N.ap.x, y: N.ap.y })
    gsap.set(q("#assoc"), { x: N.sta.x, y: N.sta.y })
    gsap.set(q("#wifi-frame"), { x: N.sta.x, y: N.sta.y })
    gsap.set(q("#eth-frame"), { x: N.ap.x, y: N.ap.y })
    gsap.set(q("#assoc-card, #frame-card, #radio-card, #bridge-card, #summary-card"), { opacity: 0, y: 8 })
    gsap.set(q(".radio-wave"), { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q(".radio-wave"), { opacity: 0.55, scale: 1, duration: 0.42, stagger: 0.08 })
      .to(q("#beacon"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#beacon"), { x: N.sta.x, y: N.sta.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#beacon"), { opacity: 0, duration: 0.08 })
      .to(q("#node-ap .node-circle"), { stroke: C.active, strokeWidth: 2.6, duration: 0.22 }, "<0.1")

    tl.addLabel("step-2")
      .to(q("#assoc"), { opacity: 1, duration: 0.05 })
      .to(q("#assoc"), { x: N.ap.x, y: N.ap.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#assoc"), { opacity: 0, duration: 0.05 })
      .to(q("#assoc-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" })
      .to(q("#node-sta .node-circle"), { stroke: C.active, strokeWidth: 2.6, duration: 0.22 }, "<")

    tl.addLabel("step-3")
      .to(q("#frame-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" })

    tl.addLabel("step-4")
      .to(q("#radio-card"), { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" })
      .to(q("#wifi-frame"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#wifi-frame"), { x: N.ap.x, y: N.ap.y, duration: 0.85, ease: "power2.inOut" })
      .to(q("#wifi-frame"), { opacity: 0, duration: 0.05 })

    tl.addLabel("step-5")
      .to(q("#bridge-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" })
      .to(q("#eth-frame"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#eth-frame"), { x: N.lan.x, y: N.lan.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#eth-frame"), { opacity: 0, duration: 0.05 })
      .to(q("#node-lan .node-circle"), { stroke: C.success, strokeWidth: 2.8, duration: 0.24 }, "<0.18")

    tl.addLabel("step-6")
      .to(q("#summary-card"), { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.2)" })
      .to(q("#node-ap .node-circle, #node-sta .node-circle"), { stroke: C.success, strokeWidth: 2.8, duration: 0.24 }, "<")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.idle, C.success, registerTimeline])

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
        <text x="400" y="38" textAnchor="middle" fill={C.subText} fontSize="10" fontWeight="800" fontFamily="var(--font-mono)">
          WI-FI 802.11: ACCESO INALAMBRICO SOBRE RADIO COMPARTIDA
        </text>

        <circle className="radio-wave" cx={N.ap.x} cy={N.ap.y} r="96" fill="none" stroke={C.active} strokeWidth="1.5" strokeDasharray="6 5" />
        <circle className="radio-wave" cx={N.ap.x} cy={N.ap.y} r="146" fill="none" stroke={C.active} strokeWidth="1.3" strokeDasharray="6 5" />
        <line x1={N.ap.x} y1={N.ap.y} x2={N.lan.x} y2={N.lan.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

        <g id="node-sta" onMouseEnter={() => handleNodeEnter("sta")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">Estacion</text>
        </g>

        <g id="node-ap" onMouseEnter={() => handleNodeEnter("ap")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.router.radius} fill={C.radioFill} stroke={C.idle} strokeWidth="1.5" />
          <RadioGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.router.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">AP</text>
        </g>

        <g id="node-lan" onMouseEnter={() => handleNodeEnter("lan")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.switch.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <SwitchGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.switch.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">LAN</text>
        </g>

        <g id="assoc-card" pointerEvents="none">
          <rect x="276" y="72" width="248" height="40" rx="12" fill={C.panel} stroke={C.active} strokeWidth="1.4" />
          <text x="400" y="89" textAnchor="middle" fill={C.active} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">ASOCIACION</text>
          <text x="400" y="103" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">La estacion entra en la celda del AP</text>
        </g>

        <g id="frame-card" pointerEvents="none">
          <rect x="52" y="102" width="220" height="56" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="162" y="120" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">TRAMA 802.11</text>
          <text x="162" y="136" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">Control + direcciones + datos</text>
          <text x="162" y="149" textAnchor="middle" fill={C.subText} fontSize="8.5" fontFamily="var(--font-mono)">No es una trama Ethernet normal</text>
        </g>

        <g id="radio-card" pointerEvents="none">
          <rect x="286" y="316" width="228" height="38" rx="12" fill={C.panel} stroke={C.warn} strokeWidth="1.4" />
          <text x="400" y="340" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">RADIO: DISTANCIA + INTERFERENCIAS</text>
        </g>

        <g id="bridge-card" pointerEvents="none">
          <rect x="522" y="114" width="210" height="50" rx="12" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="627" y="132" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">AP COMO PUENTE</text>
          <text x="627" y="148" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">802.11 entra; Ethernet sale</text>
        </g>

        <g id="summary-card" pointerEvents="none">
          <rect x="164" y="400" width="472" height="36" rx="18" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
          <text x="400" y="422" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
            WI-FI ES ACCESO A LA RED, PERO EL MEDIO ES AIRE COMPARTIDO
          </text>
        </g>

        <g id="beacon" className="packet" pointerEvents="none">
          <PacketPill label="BEACON" fill={C.radioFill} textColor={C.active} width={76} stroke={C.active} />
        </g>
        <g id="assoc" className="packet" pointerEvents="none">
          <PacketPill label="ASSOC" fill={C.radioFill} textColor={C.active} width={74} stroke={C.active} />
        </g>
        <g id="wifi-frame" className="packet" pointerEvents="none">
          <PacketPill label="802.11" fill={C.warn} textColor={C.warnText} width={72} />
        </g>
        <g id="eth-frame" className="packet" pointerEvents="none">
          <PacketPill label="ETH" fill={C.dataFill} textColor={C.dataText} width={64} />
        </g>
      </svg>
    </div>
  )
}
