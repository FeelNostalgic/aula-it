"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"

const VIEWBOX = { width: 800, height: 460 }

const SUMMARY_SHELL = {
  x: 148,
  y: 384,
  width: 504,
  height: 62,
  radius: 22,
} as const

const SUMMARY_CARDS = [
  { id: "summary-similarity", label: "SIMILITUD", text: "Ambos usan capas y modularidad", width: 190, accent: "good" },
  { id: "summary-difference", label: "DIFERENCIA", text: "7 capas vs 4 capas", width: 130, accent: "bad" },
  { id: "summary-focus", label: "ENFOQUE", text: "Teoria vs práctica", width: 124, accent: "bad" },
] as const

const SUMMARY_CARD_GAP = 14
const SUMMARY_CARD_HEIGHT = 38
const SUMMARY_TOTAL_WIDTH =
  SUMMARY_CARDS.reduce((acc, card) => acc + card.width, 0) + SUMMARY_CARD_GAP * (SUMMARY_CARDS.length - 1)
const SUMMARY_ROW_START_X = SUMMARY_SHELL.x + (SUMMARY_SHELL.width - SUMMARY_TOTAL_WIDTH) / 2
const SUMMARY_ROW_CENTER_Y = SUMMARY_SHELL.y + SUMMARY_SHELL.height / 1.5

function getSummaryCardX(index: number) {
  return SUMMARY_CARDS.slice(0, index).reduce((acc, card) => acc + card.width + SUMMARY_CARD_GAP, SUMMARY_ROW_START_X)
}

function centerY(y: number, height: number) {
  return y + height / 2
}

const OSI_LAYERS = [
  { id: "osi-l7", title: "Aplicación", subtitle: "HTTP, DNS, SMTP", x: 86, y: 82, width: 220, height: 32 },
  { id: "osi-l6", title: "Presentación", subtitle: "Formato y cifrado", x: 86, y: 118, width: 220, height: 32 },
  { id: "osi-l5", title: "Sesión", subtitle: "Control del dialogo", x: 86, y: 154, width: 220, height: 32 },
  { id: "osi-l4", title: "Transporte", subtitle: "TCP / UDP", x: 86, y: 190, width: 220, height: 32 },
  { id: "osi-l3", title: "Red", subtitle: "IP y enrutamiento", x: 86, y: 226, width: 220, height: 32 },
  { id: "osi-l2", title: "Enlace", subtitle: "Tramas y MAC", x: 86, y: 262, width: 220, height: 32 },
  { id: "osi-l1", title: "Física", subtitle: "Bits en el medio", x: 86, y: 298, width: 220, height: 32 },
] as const

const TCP_LAYERS = [
  { id: "tcp-l4", title: "Aplicación", subtitle: "Protocolos de usuario", x: 494, y: 104, width: 220, height: 50 },
  { id: "tcp-l3", title: "Transporte", subtitle: "TCP / UDP", x: 494, y: 162, width: 220, height: 50 },
  { id: "tcp-l2", title: "Internet", subtitle: "IP", x: 494, y: 220, width: 220, height: 50 },
  { id: "tcp-l1", title: "Acceso a la red", subtitle: "Enlace + Física", x: 494, y: 278, width: 220, height: 50 },
] as const

const MAPPINGS = [
  { id: "map-app-a", x1: 306, y1: centerY(82, 32), x2: 494, y2: centerY(104, 50) },
  { id: "map-app-b", x1: 306, y1: centerY(118, 32), x2: 494, y2: centerY(104, 50) },
  { id: "map-app-c", x1: 306, y1: centerY(154, 32), x2: 494, y2: centerY(104, 50) },
  { id: "map-transport", x1: 306, y1: centerY(190, 32), x2: 494, y2: centerY(162, 50) },
  { id: "map-internet", x1: 306, y1: centerY(226, 32), x2: 494, y2: centerY(220, 50) },
  { id: "map-access-a", x1: 306, y1: centerY(262, 32), x2: 494, y2: centerY(278, 50) },
  { id: "map-access-b", x1: 306, y1: centerY(298, 32), x2: 494, y2: centerY(278, 50) },
] as const

const OSI_PACKET_POINTS = {
  start: { x: 196, y: centerY(82, 32) },
  app: { x: 196, y: centerY(82, 32) },
  transport: { x: 196, y: centerY(190, 32) },
  network: { x: 196, y: centerY(226, 32) },
  link: { x: 196, y: centerY(262, 32) },
  physical: { x: 196, y: centerY(298, 32) },
  medium: { x: 196, y: 356 },
} as const

const TCP_PACKET_POINTS = {
  start: { x: 604, y: centerY(104, 50) },
  app: { x: 604, y: centerY(104, 50) },
  transport: { x: 604, y: centerY(162, 50) },
  internet: { x: 604, y: centerY(220, 50) },
  access: { x: 604, y: centerY(278, 50) },
  medium: { x: 604, y: 356 },
} as const

export function OsiTcpIpAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()

  const C =
    resolvedTheme === "light"
      ? {
        bg: "#F7FAFC",
        shell: "#CBD5E1",
        idle: "#94A3B8",
        text: "#0F172A",
        subText: "#475569",
        osi: "#0F766E",
        osiFill: "#CCFBF1",
        tcp: "#C2410C",
        tcpFill: "#FFEDD5",
        active: "#2563EB",
        activeFill: "#DBEAFE",
        concept: "#0F172A",
        conceptText: "#F8FAFC",
        line: "#94A3B8",
        map: "#2563EB",
        mapText: "#1D4ED8",
        packet: "#0F172A",
        packetText: "#F8FAFC",
        tagFill: "#E2E8F0",
        tagText: "#0F172A",
        summaryFill: "#FFFFFF",
        summaryStroke: "#CBD5E1",
        good: "#047857",
        bad: "#B45309",
      }
      : {
        bg: "#0F172A",
        shell: "#334155",
        idle: "#64748B",
        text: "#E2E8F0",
        subText: "#94A3B8",
        osi: "#2DD4BF",
        osiFill: "#0F3C39",
        tcp: "#FB923C",
        tcpFill: "#4A2C16",
        active: "#60A5FA",
        activeFill: "#172554",
        concept: "#E2E8F0",
        conceptText: "#0F172A",
        line: "#475569",
        map: "#38BDF8",
        mapText: "#BAE6FD",
        packet: "#E2E8F0",
        packetText: "#0F172A",
        tagFill: "#1E293B",
        tagText: "#E2E8F0",
        summaryFill: "#111827",
        summaryStroke: "#334155",
        good: "#34D399",
        bad: "#FBBF24",
      }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q(".layer-rect"), { stroke: C.idle, strokeWidth: 1.4, opacity: 1 })
    gsap.set(q(".osi-layer"), { fill: C.bg })
    gsap.set(q(".tcp-layer"), { fill: C.bg })
    gsap.set(q(".stack-shell"), { stroke: C.shell, strokeWidth: 1.4 })
    gsap.set(q(".mapping-band"), { opacity: 0 })
    gsap.set(q("#concept-chip, .summary-card, .summary-pill, .layer-tag"), { opacity: 0 })
    gsap.set(q("#osi-packet"), { opacity: 0, x: OSI_PACKET_POINTS.start.x, y: OSI_PACKET_POINTS.start.y })
    gsap.set(q("#tcp-packet"), { opacity: 0, x: TCP_PACKET_POINTS.start.x, y: TCP_PACKET_POINTS.start.y })
    gsap.set(q("#osi-medium, #tcp-medium"), { opacity: 0.15 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#osi-shell"), { stroke: C.osi, strokeWidth: 2.5, duration: 0.35 })
      .to(q("#tcp-shell"), { stroke: C.tcp, strokeWidth: 2.5, duration: 0.35 }, "<")
      .to(q("#concept-chip"), { opacity: 1, y: -8, duration: 0.4, ease: "back.out(1.4)" }, "<0.1")

    tl.addLabel("step-2")
      .to(q("#osi-l7"), { fill: C.osiFill, stroke: C.osi, duration: 0.22 })
      .to(q("#osi-l6"), { fill: C.osiFill, stroke: C.osi, duration: 0.22 })
      .to(q("#osi-l5"), { fill: C.osiFill, stroke: C.osi, duration: 0.22 })
      .to(q("#osi-l4"), { fill: C.activeFill, stroke: C.active, duration: 0.22 })
      .to(q("#osi-l3"), { fill: C.activeFill, stroke: C.active, duration: 0.22 })
      .to(q("#osi-l2"), { fill: C.osiFill, stroke: C.osi, duration: 0.22 })
      .to(q("#osi-l1"), { fill: C.osiFill, stroke: C.osi, duration: 0.22 })

    tl.addLabel("step-3")
      .to(q("#tcp-l4"), { fill: C.tcpFill, stroke: C.tcp, duration: 0.28 })
      .to(q("#tcp-l3"), { fill: C.activeFill, stroke: C.active, duration: 0.28 })
      .to(q("#tcp-l2"), { fill: C.activeFill, stroke: C.active, duration: 0.28 })
      .to(q("#tcp-l1"), { fill: C.tcpFill, stroke: C.tcp, duration: 0.28 })

    tl.addLabel("step-4")
      .to(q(".mapping-band"), { opacity: 1, duration: 0.25, stagger: 0.06 })
      .to(q("#osi-shell"), { strokeWidth: 2.8, duration: 0.2 }, "<")
      .to(q("#tcp-shell"), { strokeWidth: 2.8, duration: 0.2 }, "<")

    tl.addLabel("step-5")
      .to(q("#osi-packet"), { opacity: 1, duration: 0.1 })
      .to(q("#tcp-packet"), { opacity: 1, duration: 0.1 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.app.y, duration: 0.25, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.app.y, duration: 0.25, ease: "power2.inOut" }, "<")
      .to(q("#osi-tag-data, #tcp-tag-data"), { opacity: 1, duration: 0.18 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.transport.y, duration: 0.35, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.transport.y, duration: 0.35, ease: "power2.inOut" }, "<")
      .to(q("#osi-tag-segment, #tcp-tag-segment"), { opacity: 1, duration: 0.18 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.network.y, duration: 0.35, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.internet.y, duration: 0.35, ease: "power2.inOut" }, "<")
      .to(q("#osi-tag-packet, #tcp-tag-packet"), { opacity: 1, duration: 0.18 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.link.y, duration: 0.35, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.access.y, duration: 0.35, ease: "power2.inOut" }, "<")
      .to(q("#osi-tag-frame, #tcp-tag-frame"), { opacity: 1, duration: 0.18 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.physical.y, duration: 0.25, ease: "power2.inOut" })
      .to(q("#osi-tag-bits"), { opacity: 1, duration: 0.18 }, "<")
      .to(q("#osi-medium"), { opacity: 0.95, duration: 0.2 }, "<")
      .to(q("#tcp-medium"), { opacity: 0.95, duration: 0.2 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.medium.y, duration: 0.22, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.medium.y, duration: 0.22, ease: "power2.inOut" }, "<")
      .to(q("#osi-packet, #tcp-packet"), { opacity: 0, duration: 0.2 })

    tl.addLabel("step-6")
      .to(q("#summary-shell"), { opacity: 1, duration: 0.2 })
      .to(q(".summary-card"), { opacity: 1, y: -10, duration: 0.32, stagger: 0.08, ease: "back.out(1.2)" })
      .to(q(".summary-pill"), { opacity: 1, y: -6, duration: 0.22, stagger: 0.06 }, "<0.04")

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [
    C.active,
    C.activeFill,
    C.bg,
    C.idle,
    C.map,
    C.osi,
    C.osiFill,
    C.shell,
    C.tcp,
    C.tcpFill,
    registerTimeline,
  ])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="800" height="460" fill="transparent" />

      <g opacity="0.32">
        <circle cx="96" cy="38" r="28" fill={C.osiFill} />
        <circle cx="700" cy="38" r="34" fill={C.tcpFill} />
        <circle cx="402" cy="420" r="46" fill={C.activeFill} />
      </g>

      <g>
        <text x="86" y="34" fill={C.osi} fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
          MODELO OSI
        </text>
        <text x="86" y="50" fill={C.subText} fontSize="11" fontFamily="var(--font-mono)">
          7 capas, enfoque didactico
        </text>
        <text x="494" y="34" fill={C.tcp} fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
          MODELO TCP/IP
        </text>
        <text x="494" y="50" fill={C.subText} fontSize="11" fontFamily="var(--font-mono)">
          4 capas, enfoque practico
        </text>
      </g>

      <rect
        id="osi-shell"
        className="stack-shell"
        x="72"
        y="70"
        width="248"
        height="276"
        rx="24"
        fill="none"
        stroke={C.shell}
      />
      <rect
        id="tcp-shell"
        className="stack-shell"
        x="480"
        y="92"
        width="248"
        height="248"
        rx="24"
        fill="none"
        stroke={C.shell}
      />

      {OSI_LAYERS.map((layer, index) => (
        <g key={layer.id}>
          <rect
            id={layer.id}
            className="layer-rect osi-layer"
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            rx="12"
            fill={C.bg}
            stroke={C.idle}
          />
          <text
            x={layer.x + 14}
            y={layer.y + 14}
            fill={C.subText}
            fontSize="9"
            fontWeight="700"
            fontFamily="var(--font-mono)"
          >
            L{7 - index}
          </text>
          <text
            x={layer.x + 52}
            y={layer.y + 14}
            fill={C.text}
            fontSize="12"
            fontWeight="700"
          >
            {layer.title}
          </text>
          <text
            x={layer.x + 52}
            y={layer.y + 26}
            fill={C.subText}
            fontSize="9.5"
            fontFamily="var(--font-mono)"
          >
            {layer.subtitle}
          </text>
        </g>
      ))}

      {TCP_LAYERS.map((layer, index) => (
        <g key={layer.id}>
          <rect
            id={layer.id}
            className="layer-rect tcp-layer"
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            rx="14"
            fill={C.bg}
            stroke={C.idle}
          />
          <text
            x={layer.x + 14}
            y={layer.y + 18}
            fill={C.subText}
            fontSize="9"
            fontWeight="700"
            fontFamily="var(--font-mono)"
          >
            C{4 - index}
          </text>
          <text
            x={layer.x + 56}
            y={layer.y + 20}
            fill={C.text}
            fontSize="12.5"
            fontWeight="700"
          >
            {layer.title}
          </text>
          <text
            x={layer.x + 56}
            y={layer.y + 35}
            fill={C.subText}
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {layer.subtitle}
          </text>
        </g>
      ))}

      {MAPPINGS.map((mapping) => (
        <g key={mapping.id} className="mapping-band">
          <line
            x1={mapping.x1}
            y1={mapping.y1}
            x2={mapping.x2}
            y2={mapping.y2}
            stroke={C.map}
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        </g>
      ))}

      <g id="concept-chip">
        <rect x="308" y="12" width="184" height="24" rx="12" fill={C.concept} />
        <text x="400" y="28" textAnchor="middle" fill={C.conceptText} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
          CAPAS = FUNCIONES SEPARADAS
        </text>
      </g>

      <g id="osi-packet">
        <rect x="-34" y="-11" width="68" height="22" rx="11" fill={C.packet} />
        <text textAnchor="middle" y="4" fill={C.packetText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          DATOS
        </text>
      </g>

      <g id="tcp-packet">
        <rect x="-34" y="-11" width="68" height="22" rx="11" fill={C.packet} />
        <text textAnchor="middle" y="4" fill={C.packetText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          DATOS
        </text>
      </g>

      <g className="layer-tag" id="osi-tag-data">
        <rect x="314" y="170" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="353" y="182" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Datos
        </text>
      </g>
      <g className="layer-tag" id="osi-tag-segment">
        <rect x="314" y="188" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="353" y="200" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Segmento
        </text>
      </g>
      <g className="layer-tag" id="osi-tag-packet">
        <rect x="314" y="226" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="353" y="238" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Paquete IP
        </text>
      </g>
      <g className="layer-tag" id="osi-tag-frame">
        <rect x="314" y="264" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="353" y="276" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Trama
        </text>
      </g>
      <g className="layer-tag" id="osi-tag-bits">
        <rect x="314" y="302" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="353" y="314" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Bits
        </text>
      </g>

      <g className="layer-tag" id="tcp-tag-data">
        <rect x="408" y="170" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="447" y="182" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Datos
        </text>
      </g>
      <g className="layer-tag" id="tcp-tag-segment">
        <rect x="408" y="188" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="447" y="200" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Segmento
        </text>
      </g>
      <g className="layer-tag" id="tcp-tag-packet">
        <rect x="408" y="246" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="447" y="258" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Paquete IP
        </text>
      </g>
      <g className="layer-tag" id="tcp-tag-frame">
        <rect x="408" y="304" width="78" height="18" rx="9" fill={C.tagFill} />
        <text x="447" y="316" textAnchor="middle" fill={C.tagText} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          Trama / Bits
        </text>
      </g>

      <g id="osi-medium">
        <line x1="118" y1="362" x2="274" y2="362" stroke={C.osi} strokeWidth="4" strokeLinecap="round" />
        <text x="196" y="382" textAnchor="middle" fill={C.subText} fontSize="10" fontFamily="var(--font-mono)">
          Medio fisico
        </text>
      </g>
      <g id="tcp-medium">
        <line x1="526" y1="362" x2="682" y2="362" stroke={C.tcp} strokeWidth="4" strokeLinecap="round" />
        <text x="604" y="382" textAnchor="middle" fill={C.subText} fontSize="10" fontFamily="var(--font-mono)">
          Medio fisico
        </text>
      </g>

      <g id="summary-shell" opacity="0">
        <rect
          x={SUMMARY_SHELL.x}
          y={SUMMARY_SHELL.y}
          width={SUMMARY_SHELL.width}
          height={SUMMARY_SHELL.height}
          rx={SUMMARY_SHELL.radius}
          fill={C.summaryFill}
          stroke={C.summaryStroke}
        />
      </g>

      {SUMMARY_CARDS.map((card, index) => {
        const x = getSummaryCardX(index)
        const centerX = x + card.width / 2
        const accentColor = card.accent === "good" ? C.good : C.bad

        return (
          <g key={card.id} className="summary-card" transform="translate(0 10)">
            <rect
              x={x}
              y={SUMMARY_ROW_CENTER_Y - SUMMARY_CARD_HEIGHT / 2}
              width={card.width}
              height={SUMMARY_CARD_HEIGHT}
              rx={SUMMARY_CARD_HEIGHT / 2}
              fill={C.summaryFill}
              stroke={C.summaryStroke}
            />
            <text
              x={centerX}
              y={SUMMARY_ROW_CENTER_Y - 7}
              textAnchor="middle"
              fill={accentColor}
              fontSize="8.5"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              dominantBaseline="middle"
            >
              {card.label}
            </text>
            <text
              x={centerX}
              y={SUMMARY_ROW_CENTER_Y + 6}
              textAnchor="middle"
              fill={C.text}
              fontSize="10.5"
              fontWeight="600"
              dominantBaseline="middle"
            >
              {card.text}
            </text>
          </g>
        )
      })}

      <g className="summary-pill" transform="translate(0 6)">
        <rect x="318" y="96" width="84" height="18" rx="9" fill={C.tagFill} />
        <text x="360" y="108" textAnchor="middle" fill={C.mapText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          App = L7-L5
        </text>
      </g>
      <g className="summary-pill" transform="translate(0 6)">
        <rect x="318" y="208" width="84" height="18" rx="9" fill={C.tagFill} />
        <text x="360" y="220" textAnchor="middle" fill={C.mapText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          L4 = Transporte
        </text>
      </g>
      <g className="summary-pill" transform="translate(0 6)">
        <rect x="318" y="244" width="84" height="18" rx="9" fill={C.tagFill} />
        <text x="360" y="256" textAnchor="middle" fill={C.mapText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          L3 = Internet
        </text>
      </g>
      <g className="summary-pill" transform="translate(0 6)">
        <rect x="318" y="292" width="84" height="18" rx="9" fill={C.tagFill} />
        <text x="360" y="304" textAnchor="middle" fill={C.mapText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          L2-L1 = Acceso
        </text>
      </g>
    </svg>
  )
}
