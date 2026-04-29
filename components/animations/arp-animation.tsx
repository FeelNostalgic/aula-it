"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, SwitchGlyph } from "./network-device-icons"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"

// Node positions in SVG space
const N = {
  sw: { x: 400, y: 90 },
  a: { x: 140, y: 340 },
  b: { x: 400, y: 340 },
  c: { x: 660, y: 340 },
}

const TOOLTIP_ANCHORS = {
  sw: { x: N.sw.x + NETWORK_DEVICE_STYLE.switch.radius, y: N.sw.y + NETWORK_DEVICE_STYLE.switch.radius },
  a: { x: N.a.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.a.y + NETWORK_DEVICE_STYLE.pc.radius },
  b: { x: N.b.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.b.y + NETWORK_DEVICE_STYLE.pc.radius },
  c: { x: N.c.x + NETWORK_DEVICE_STYLE.pc.radius, y: N.c.y + NETWORK_DEVICE_STYLE.pc.radius },
} as const

const VB = { w: 800, h: 460 }

// Node info data
const NODE_INFO: Record<string, NodeInfo> = {
  sw: {
    id: "sw",
    label: "Switch",
    macTable: [
      { mac: "AA:BB:CC:11:22:33", port: "Fa0/1" },
      { mac: "B4:22:DA:FF:11:22", port: "Fa0/2" },
      { mac: "CA:FE:00:DE:AD:BE", port: "Fa0/3" },
    ],
  },
  a: {
    id: "a",
    label: "PC A",
    ip: "192.168.1.10",
    mask: "24",
    mac: "AA:BB:CC:11:22:33",
    gateway: "192.168.1.1",
  },
  b: {
    id: "b",
    label: "PC B",
    ip: "192.168.1.20",
    mask: "24",
    mac: "B4:22:DA:FF:11:22",
    gateway: "192.168.1.1",
  },
  c: {
    id: "c",
    label: "PC C",
    ip: "192.168.1.30",
    mask: "24",
    mac: "CA:FE:00:DE:AD:BE",
    gateway: "192.168.1.1",
  },
}

export function ArpAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
          warnText: "#111827",
          successText: "#F8FAFC",
          successMacText: "#ECFDF5",
          successMacStroke: "rgba(6, 95, 70, 0.55)",
          subText: "#475569",
        }
      : {
          idle: "#64748B",
          active: "#38BDF8",
          success: "#34D399",
          warn: "#FBBF24",
          muted: "#334155",
          fg: "#E5E7EB",
          bg: "#1F2937",
          warnText: "#111827",
          successText: "#F8FAFC",
          successMacText: "#052E2B",
          successMacStroke: "rgba(255, 255, 255, 0.42)",
          subText: "#A3B0C2",
        }

  const handleNodeEnter = useCallback((id: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setSelectedNode(id)
  }, [])

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setSelectedNode(null), 180)
  }, [])

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    // ── Initial state ──────────────────────────────────────────────────
    // Position node groups (centered on their SVG coordinates)
    gsap.set(q("#node-sw"), { x: N.sw.x, y: N.sw.y })
    gsap.set(q("#node-a"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#node-b"), { x: N.b.x, y: N.b.y })
    gsap.set(q("#node-c"), { x: N.c.x, y: N.c.y })

    // Reset node circles to idle style
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })

    // Packets: all hidden, positioned at their source
    gsap.set(q(".packet"), { opacity: 0 })
    gsap.set(q("#pkt-req"), { x: N.a.x, y: N.a.y })
    gsap.set(q("#pkt-bc-b"), { x: N.sw.x, y: N.sw.y })
    gsap.set(q("#pkt-bc-c"), { x: N.sw.x, y: N.sw.y })
    gsap.set(q("#pkt-reply-up"), { x: N.b.x, y: N.b.y })
    gsap.set(q("#pkt-reply-down"), { x: N.sw.x, y: N.sw.y })

    // Text / overlays: hidden
    gsap.set(q("#question-mark"), { opacity: 0, y: 0 })
    gsap.set(q("#arp-table, #cache-miss, #arp-summary"), { opacity: 0, y: 8 })
    gsap.set(q("#label-bc"), { opacity: 0 })

    // ── Timeline ───────────────────────────────────────────────────────
    const tl = gsap.timeline({ paused: true })

    // STEP 1 — A quiere hablar con B
    tl.addLabel("step-1")
      .to(q("#node-a .node-circle"), { stroke: C.warn, strokeWidth: 2.5, duration: 0.3 })
      .to(q("#node-a .ring"), {
        scale: 1.6, opacity: 0.5,
        repeat: 2, yoyo: true,
        ease: "power1.inOut", duration: 0.45,
        transformOrigin: "50% 50%",
      }, "<")
      .to(q("#question-mark"), { opacity: 1, y: -12, duration: 0.3 })

    tl.addLabel("step-2")
      .to(q("#cache-miss"), { opacity: 1, y: 0, duration: 0.36, ease: "back.out(1.3)" })
      .to(q("#node-a .node-circle"), { stroke: C.warn, strokeWidth: 3, duration: 0.25 }, "<")

    // STEP 3 — ARP Request broadcast
    tl.addLabel("step-3")
      .to(q("#question-mark"), { opacity: 0, y: -18, duration: 0.2 })
      .to(q("#cache-miss"), { opacity: 0, y: -8, duration: 0.2 }, "<")
      .to(q("#node-a .node-circle"), { stroke: C.active, duration: 0.2 }, "<")
      // Packet: A → Router
      .to(q("#pkt-req"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-req"), { x: N.sw.x, y: N.sw.y, duration: 0.7, ease: "power2.inOut" })
      .to(q("#pkt-req"), { opacity: 0, duration: 0.05 })
      // Broadcast label appears on router
      .to(q("#label-bc"), { opacity: 1, duration: 0.2 })
      // Fan out: Router → B and C simultaneously
      .to(q("#pkt-bc-b"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-bc-c"), { opacity: 1, duration: 0.05 }, "<")
      .to(q("#pkt-bc-b"), { x: N.b.x, y: N.b.y, duration: 0.65, ease: "power2.out" }, "<")
      .to(q("#pkt-bc-c"), { x: N.c.x, y: N.c.y, duration: 0.65, ease: "power2.out" }, "<")
      .to(q("#pkt-bc-b, #pkt-bc-c, #label-bc"), { opacity: 0, duration: 0.2 })
      // Highlight all as received
      .to(q("#node-b .node-circle"), { stroke: C.active, strokeWidth: 2, duration: 0.3 }, "<")
      .to(q("#node-c .node-circle"), { stroke: C.active, strokeWidth: 2, duration: 0.3 }, "<")

    // STEP 4 — Solo B reconoce la petición
    tl.addLabel("step-4")
      // C dims → not the target
      .to(q("#node-c .node-circle"), { stroke: C.idle, opacity: 0.35, duration: 0.4 })
      .to(q("#node-c"), { opacity: 0.4, duration: 0.4 }, "<")
      // A dims too (waiting)
      .to(q("#node-a .node-circle"), { stroke: C.idle, opacity: 0.5, duration: 0.4 }, "<")
      // B glows green
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 }, "<")

    // STEP 5 — ARP Reply B → A (unicast)
    tl.addLabel("step-5")
      // Restore A and C
      .to(q("#node-a"), { opacity: 1, duration: 0.2 })
      .to(q("#node-a .node-circle"), { stroke: C.idle, opacity: 1, duration: 0.2 }, "<")
      .to(q("#node-c"), { opacity: 1, duration: 0.2 }, "<")
      .to(q("#node-c .node-circle"), { stroke: C.idle, opacity: 1, duration: 0.2 }, "<")
      // Reply packet: B → Router
      .to(q("#pkt-reply-up"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-reply-up"), { x: N.sw.x, y: N.sw.y, duration: 0.65, ease: "power2.inOut" })
      .to(q("#pkt-reply-up"), { opacity: 0, duration: 0.05 })
      // Reply packet: Router → A (with MAC info)
      .to(q("#pkt-reply-down"), { opacity: 1, duration: 0.05 })
      .to(q("#pkt-reply-down"), { x: N.a.x, y: N.a.y, duration: 0.65, ease: "power2.inOut" })
      .to(q("#pkt-reply-down"), { opacity: 0, duration: 0.25 })

    // STEP 6 — A actualiza tabla ARP
    tl.addLabel("step-6")
      .to(q("#node-a .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 })
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 }, "<")
      .to(q("#arp-table"), { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)" })
      .to(q("#arp-summary"), { opacity: 1, y: 0, duration: 0.36, ease: "back.out(1.2)" }, "<0.12")

    registerTimeline(tl)
    return () => { tl.kill() }
  }, [C.active, C.bg, C.fg, C.idle, C.success, C.warn, registerTimeline])

  // ── SVG ─────────────────────────────────────────────────────────────────
  const activeInfo = selectedNode ? NODE_INFO[selectedNode] : null

  return (
    <div className="relative w-full h-full">
      {/* Node info card overlay */}
      <AnimatePresence>
        {activeInfo && (
          <NodeInfoCard
            node={activeInfo}
            anchorX={TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS].x}
            anchorY={TOOLTIP_ANCHORS[selectedNode as keyof typeof TOOLTIP_ANCHORS].y}
            viewBoxW={VB.w}
            viewBoxH={VB.h}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          />
        )}
      </AnimatePresence>

      <svg
        ref={svgRef}
        viewBox="0 0 800 460"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Static links ────────────────────────────────────────────── */}
        <line x1={N.a.x} y1={N.a.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={N.b.x} y1={N.b.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1={N.c.x} y1={N.c.y} x2={N.sw.x} y2={N.sw.y} stroke={C.idle} strokeWidth="1.5" strokeDasharray="4 3" />

        {/* ── Switch ──────────────────────────────────────────────────── */}
        <g id="node-sw" onMouseEnter={() => handleNodeEnter("sw")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.switch.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <SwitchGlyph stroke={C.active} />
          <text y={NETWORK_DEVICE_STYLE.switch.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">Switch</text>
          {/* Broadcast label (shown in step 2) */}
          <g id="label-bc" pointerEvents="none">
            <rect x="-30" y="-60" width="60" height="18" rx="4" fill={C.warn} />
            <text y="-47" textAnchor="middle" fill={C.warnText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">BROADCAST</text>
          </g>
        </g>

        {/* ── PC A ────────────────────────────────────────────────────── */}
        <g id="node-a" onMouseEnter={() => handleNodeEnter("a")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="ring" r={NETWORK_DEVICE_STYLE.pc.pulseRadius} fill="none" stroke={C.active} strokeWidth="1" opacity="0.2" />
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC A</text>
          <text id="question-mark" x="28" y="-18" fill={C.warn} fontSize="24" fontWeight="900" pointerEvents="none">?</text>
          {/* ARP table revealed in step 5 */}
          <g id="arp-table" pointerEvents="none">
            <rect x="-10" y="-115" width="160" height="56" rx="6" fill={C.bg} stroke={C.success} strokeWidth="1.5" />
            <text x="0" y="-97" fontSize="9" fill={C.success} fontWeight="700" fontFamily="var(--font-mono)">TABLA ARP</text>
            <line x1="-2" y1="-90" x2="148" y2="-90" stroke={C.idle} strokeWidth="0.75" />
            <text x="0" y="-77" fontSize="8" fill={C.fg} fontFamily="var(--font-mono)">IP (B)  → B4:22:DA:FF:11:22</text>
            <text x="0" y="-65" fontSize="8" fill={C.subText} fontFamily="var(--font-mono)">Interfaz: eth0</text>
          </g>
        </g>

        <g id="cache-miss" pointerEvents="none">
          <rect x="238" y="182" width="324" height="42" rx="12" fill={C.bg} stroke={C.warn} strokeWidth="1.5" />
          <text x="400" y="199" textAnchor="middle" fill={C.warn} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
            CACHE ARP LOCAL
          </text>
          <text x="400" y="213" textAnchor="middle" fill={C.fg} fontSize="8.5" fontFamily="var(--font-mono)">
            192.168.1.20 {"->"} ?  Todavia no hay MAC
          </text>
        </g>

        <g id="arp-summary" pointerEvents="none">
          <rect x="266" y="420" width="268" height="34" rx="17" fill={C.bg} stroke={C.success} strokeWidth="1.5" />
          <text x="400" y="440" textAnchor="middle" fill={C.success} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
            ARP RESUELVE IP LOCAL {"->"} MAC LOCAL
          </text>
        </g>

        {/* ── PC B ────────────────────────────────────────────────────── */}
        <g id="node-b" onMouseEnter={() => handleNodeEnter("b")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC B</text>
        </g>

        {/* ── PC C ────────────────────────────────────────────────────── */}
        <g id="node-c" onMouseEnter={() => handleNodeEnter("c")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <PcGlyph stroke={C.fg} />
          <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC C</text>
        </g>

        {/* ── Packets (moved by GSAP) ──────────────────────────────────── */}
        <g id="pkt-req" className="packet" pointerEvents="none">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-bc-b" className="packet" pointerEvents="none">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-bc-c" className="packet" pointerEvents="none">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-reply-up" className="packet" pointerEvents="none">
          <rect x="-34" y="-11" width="68" height="22" rx="5" fill={C.success} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.successText} fontWeight="700" fontFamily="var(--font-mono)">ARP REPLY</text>
        </g>

        <g id="pkt-reply-down" className="packet" pointerEvents="none">
          <rect x="-52" y="-16" width="104" height="32" rx="5" fill={C.success} />
          <text textAnchor="middle" y="-3" fontSize="8.5" fill={C.successText} fontWeight="700" fontFamily="var(--font-mono)">ARP REPLY</text>
          <text
            textAnchor="middle"
            y="10"
            fontSize="8"
            fill={C.successMacText}
            stroke={C.successMacStroke}
            strokeWidth="0.35"
            paintOrder="stroke fill"
            fontWeight="700"
            fontFamily="var(--font-mono)"
            letterSpacing="0.2px"
          >
            B4:22:DA:FF:11:22
          </text>
        </g>
      </svg>
    </div>
  )
}
