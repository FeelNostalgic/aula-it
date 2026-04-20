"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"

// Node positions in SVG space
const N = {
  sw: { x: 400, y: 90 },
  a: { x: 140, y: 340 },
  b: { x: 400, y: 340 },
  c: { x: 660, y: 340 },
}

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
    gsap.set(q("#arp-table"), { opacity: 0, y: 8 })
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

    // STEP 2 — ARP Request broadcast
    tl.addLabel("step-2")
      .to(q("#question-mark"), { opacity: 0, y: -18, duration: 0.2 })
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

    // STEP 3 — Solo B reconoce la petición
    tl.addLabel("step-3")
      // C dims → not the target
      .to(q("#node-c .node-circle"), { stroke: C.idle, opacity: 0.35, duration: 0.4 })
      .to(q("#node-c"), { opacity: 0.4, duration: 0.4 }, "<")
      // A dims too (waiting)
      .to(q("#node-a .node-circle"), { stroke: C.idle, opacity: 0.5, duration: 0.4 }, "<")
      // B glows green
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 }, "<")

    // STEP 4 — ARP Reply B → A (unicast)
    tl.addLabel("step-4")
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

    // STEP 5 — A actualiza tabla ARP
    tl.addLabel("step-5")
      .to(q("#node-a .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 })
      .to(q("#node-b .node-circle"), { stroke: C.success, strokeWidth: 3, duration: 0.4 }, "<")
      .to(q("#arp-table"), { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)" })

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
            svgX={N[selectedNode as keyof typeof N].x}
            svgY={N[selectedNode as keyof typeof N].y}
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
          <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          {/* Switch icon: box with ports */}
          <rect x="-18" y="-8" width="36" height="16" rx="3" fill="none" stroke={C.active} strokeWidth="1.5" />
          <rect cx="-10" cy="0" x="-13" y="-3" width="4" height="6" rx="1" fill={C.active} />
          <rect cx="-3"  cy="0" x="-4"  y="-3" width="4" height="6" rx="1" fill={C.active} />
          <rect cx="4"   cy="0" x="5"   y="-3" width="4" height="6" rx="1" fill={C.active} />
          <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">Switch</text>
          {/* Broadcast label (shown in step 2) */}
          <g id="label-bc">
            <rect x="-30" y="-60" width="60" height="18" rx="4" fill={C.warn} />
            <text y="-47" textAnchor="middle" fill={C.warnText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">BROADCAST</text>
          </g>
        </g>

        {/* ── PC A ────────────────────────────────────────────────────── */}
        <g id="node-a" onMouseEnter={() => handleNodeEnter("a")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="ring" r="50" fill="none" stroke={C.active} strokeWidth="1" opacity="0.2" />
          <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-6" y1="8" x2="6" y2="8" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-12" y1="13" x2="12" y2="13" stroke={C.fg} strokeWidth="1.5" />
          <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC A</text>
          <text id="question-mark" x="28" y="-18" fill={C.warn} fontSize="24" fontWeight="900">?</text>
          {/* ARP table revealed in step 5 */}
          <g id="arp-table">
            <rect x="-10" y="-115" width="160" height="56" rx="6" fill={C.bg} stroke={C.success} strokeWidth="1.5" />
            <text x="0" y="-97" fontSize="9" fill={C.success} fontWeight="700" fontFamily="var(--font-mono)">TABLA ARP</text>
            <line x1="-2" y1="-90" x2="148" y2="-90" stroke={C.idle} strokeWidth="0.75" />
            <text x="0" y="-77" fontSize="8" fill={C.fg} fontFamily="var(--font-mono)">IP (B)  → B4:22:DA:FF:11:22</text>
            <text x="0" y="-65" fontSize="8" fill={C.subText} fontFamily="var(--font-mono)">Interfaz: eth0</text>
          </g>
        </g>

        {/* ── PC B ────────────────────────────────────────────────────── */}
        <g id="node-b" onMouseEnter={() => handleNodeEnter("b")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-6" y1="8" x2="6" y2="8" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-12" y1="13" x2="12" y2="13" stroke={C.fg} strokeWidth="1.5" />
          <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC B</text>
        </g>

        {/* ── PC C ────────────────────────────────────────────────────── */}
        <g id="node-c" onMouseEnter={() => handleNodeEnter("c")} onMouseLeave={scheduleHide} className="cursor-default">
          <circle className="node-circle" r="36" fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
          <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-6" y1="8" x2="6" y2="8" stroke={C.fg} strokeWidth="1.5" />
          <line x1="-12" y1="13" x2="12" y2="13" stroke={C.fg} strokeWidth="1.5" />
          <text y="54" textAnchor="middle" fill={C.fg} fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">PC C</text>
        </g>

        {/* ── Packets (moved by GSAP) ──────────────────────────────────── */}
        <g id="pkt-req" className="packet">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-bc-b" className="packet">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-bc-c" className="packet">
          <rect x="-30" y="-11" width="60" height="22" rx="5" fill={C.warn} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.warnText} fontWeight="700" fontFamily="var(--font-mono)">ARP REQ</text>
        </g>

        <g id="pkt-reply-up" className="packet">
          <rect x="-34" y="-11" width="68" height="22" rx="5" fill={C.success} />
          <text textAnchor="middle" y="4" fontSize="8.5" fill={C.successText} fontWeight="700" fontFamily="var(--font-mono)">ARP REPLY</text>
        </g>

        <g id="pkt-reply-down" className="packet">
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
