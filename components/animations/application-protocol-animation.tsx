"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, ServerGlyph } from "./network-device-icons"
import { PacketPill } from "./network-visual-primitives"
import { NodeInfoCard, type NodeInfo } from "./node-info-card"
import { useNodeTooltip } from "./use-node-tooltip"

const VIEWBOX = { width: 800, height: 460 } as const

type ProtocolTone = "warn" | "active" | "success"
type ProtocolPacketTone = "primary" | "secondary" | "tertiary"

interface ProtocolNode {
  id: string
  label: string
  x: number
  y: number
  kind: "pc" | "server"
  info: NodeInfo
  fontSize?: number
}

interface ProtocolLink {
  from: string
  to: string
}

interface ProtocolCard {
  id: string
  x: number
  y: number
  width: number
  title: string
  body: string
  tone: ProtocolTone
}

interface ProtocolPacket {
  id: string
  label: string
  tone: ProtocolPacketTone
  width?: number
}

interface ProtocolMotion {
  packetId: string
  from: string
  to: string
  duration?: number
  hideAfter?: boolean
}

interface ProtocolHighlight {
  nodeId: string
  tone: ProtocolTone
  strokeWidth?: number
}

interface ProtocolStep {
  id: "step-1" | "step-2" | "step-3" | "step-4" | "step-5"
  highlights?: ProtocolHighlight[]
  showCards?: string[]
  motions?: ProtocolMotion[]
}

interface ApplicationProtocolAnimationProps {
  headline: string
  headlineY?: number
  nodes: ProtocolNode[]
  links: ProtocolLink[]
  cards: ProtocolCard[]
  packets: ProtocolPacket[]
  steps: ProtocolStep[]
}

function getNodeStyle(kind: ProtocolNode["kind"]) {
  return kind === "server" ? NETWORK_DEVICE_STYLE.server : NETWORK_DEVICE_STYLE.pc
}

export function ApplicationProtocolAnimation({
  headline,
  headlineY = 208,
  nodes,
  links,
  cards,
  packets,
  steps,
}: ApplicationProtocolAnimationProps) {
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
          packetPrimaryFill: "#DBEAFE",
          packetPrimaryText: "#1D4ED8",
          packetSecondaryFill: "#DCFCE7",
          packetSecondaryText: "#047857",
          packetTertiaryFill: "#FEF3C7",
          packetTertiaryText: "#92400E",
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
          packetPrimaryFill: "#172554",
          packetPrimaryText: "#BFDBFE",
          packetSecondaryFill: "#052E2B",
          packetSecondaryText: "#A7F3D0",
          packetTertiaryFill: "#78350F",
          packetTertiaryText: "#FDE68A",
        }

  const tooltipAnchors = Object.fromEntries(
    nodes.map((node) => {
      const style = getNodeStyle(node.kind)
      return [node.id, { x: node.x + style.radius, y: node.y + style.radius }]
    }),
  ) as Record<string, { x: number; y: number }>

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    for (const node of nodes) {
      gsap.set(q(`#node-${node.id}`), { x: node.x, y: node.y })
    }
    gsap.set(q(".node-circle"), { stroke: C.idle, strokeWidth: 1.5, opacity: 1 })

    for (const card of cards) {
      gsap.set(q(`#card-${card.id}`), { opacity: 0, y: 8 })
    }

    for (const packet of packets) {
      const initialMotion = steps.flatMap((step) => step.motions ?? []).find((motion) => motion.packetId === packet.id)
      const initialNode = nodes.find((node) => node.id === initialMotion?.from) ?? nodes[0]
      gsap.set(q(`#pkt-${packet.id}`), { x: initialNode.x, y: initialNode.y, opacity: 0 })
    }

    const tl = gsap.timeline({ paused: true })

    for (const step of steps) {
      tl.addLabel(step.id)

      step.highlights?.forEach((highlight, index) => {
        const color = highlight.tone === "warn" ? C.warn : highlight.tone === "success" ? C.success : C.active
        tl.to(
          q(`#node-${highlight.nodeId} .node-circle`),
          {
            stroke: color,
            strokeWidth: highlight.strokeWidth ?? (highlight.tone === "success" ? 3 : 2.5),
            duration: 0.24,
          },
          index === 0 ? undefined : "<0.08",
        )
      })

      step.showCards?.forEach((cardId, index) => {
        tl.to(
          q(`#card-${cardId}`),
          { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.2)" },
          index === 0 ? "<0.06" : "<0.08",
        )
      })

      step.motions?.forEach((motion, index) => {
        const fromNode = nodes.find((node) => node.id === motion.from)
        const toNode = nodes.find((node) => node.id === motion.to)
        if (!fromNode || !toNode) return

        const startAt = index === 0 ? undefined : "<0.06"
        tl.to(q(`#pkt-${motion.packetId}`), { x: fromNode.x, y: fromNode.y, opacity: 1, duration: 0.05 }, startAt)
        tl.to(q(`#pkt-${motion.packetId}`), {
          x: toNode.x,
          y: toNode.y,
          duration: motion.duration ?? 0.68,
          ease: "power2.inOut",
        })
        if (motion.hideAfter !== false) {
          tl.to(q(`#pkt-${motion.packetId}`), { opacity: 0, duration: 0.08 })
        }
      })
    }

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.active, C.idle, C.success, C.warn, cards, nodes, packets, registerTimeline, steps])

  const activeInfo = selectedNode ? nodes.find((node) => node.id === selectedNode)?.info ?? null : null

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {activeInfo && selectedNode && (
          <NodeInfoCard
            node={activeInfo}
            anchorX={tooltipAnchors[selectedNode].x}
            anchorY={tooltipAnchors[selectedNode].y}
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
        {links.map((link) => {
          const from = nodes.find((node) => node.id === link.from)
          const to = nodes.find((node) => node.id === link.to)
          if (!from || !to) return null
          return (
            <line
              key={`${link.from}-${link.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={C.idle}
              strokeWidth="1.8"
              strokeDasharray="7 5"
            />
          )
        })}

        <text x="400" y={headlineY} textAnchor="middle" fill={C.subText} fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)">
          {headline}
        </text>

        {nodes.map((node) => {
          const style = getNodeStyle(node.kind)
          return (
            <g
              key={node.id}
              id={`node-${node.id}`}
              onMouseEnter={() => handleNodeEnter(node.id)}
              onMouseLeave={scheduleHide}
              className="cursor-default"
            >
              <circle className="node-circle" r={style.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
              {node.kind === "server" ? <ServerGlyph stroke={C.fg} /> : <PcGlyph stroke={C.fg} />}
              <text
                y={style.labelOffsetY}
                textAnchor="middle"
                fill={C.fg}
                fontSize={node.fontSize ?? 13}
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                {node.label}
              </text>
            </g>
          )
        })}

        {cards.map((card) => {
          const toneColor = card.tone === "warn" ? C.warn : card.tone === "success" ? C.success : C.active
          return (
            <g key={card.id} id={`card-${card.id}`} pointerEvents="none">
              <rect x={card.x} y={card.y} width={card.width} height="44" rx="12" fill={C.panel} stroke={toneColor} strokeWidth="1.4" />
              <text
                x={card.x + card.width / 2}
                y={card.y + 17}
                textAnchor="middle"
                fill={toneColor}
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {card.title}
              </text>
              <text
                x={card.x + card.width / 2}
                y={card.y + 31}
                textAnchor="middle"
                fill={C.fg}
                fontSize="8.5"
                fontFamily="var(--font-mono)"
              >
                {card.body}
              </text>
            </g>
          )
        })}

        {packets.map((packet) => {
          const fill = packet.tone === "primary" ? C.packetPrimaryFill : packet.tone === "secondary" ? C.packetSecondaryFill : C.packetTertiaryFill
          const text = packet.tone === "primary" ? C.packetPrimaryText : packet.tone === "secondary" ? C.packetSecondaryText : C.packetTertiaryText
          return (
            <g key={packet.id} id={`pkt-${packet.id}`} pointerEvents="none">
              <PacketPill label={packet.label} fill={fill} textColor={text} width={packet.width ?? 84} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
