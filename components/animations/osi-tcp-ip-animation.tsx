"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"

const VIEWBOX = { width: 800, height: 460 }

function centerY(y: number, height: number) {
  return y + height / 2
}

const OSI_LAYERS = [
  { id: "osi-l7", tone: "app", title: "Aplicacion", subtitle: "HTTP, DNS, SMTP", x: 82, y: 82, width: 228, height: 32 },
  { id: "osi-l6", tone: "app", title: "Presentacion", subtitle: "Formato y cifrado", x: 82, y: 118, width: 228, height: 32 },
  { id: "osi-l5", tone: "app", title: "Sesion", subtitle: "Control del dialogo", x: 82, y: 154, width: 228, height: 32 },
  { id: "osi-l4", tone: "transport", title: "Transporte", subtitle: "TCP / UDP", x: 82, y: 194, width: 228, height: 32 },
  { id: "osi-l3", tone: "internet", title: "Red", subtitle: "IP y enrutamiento", x: 82, y: 234, width: 228, height: 32 },
  { id: "osi-l2", tone: "access", title: "Enlace", subtitle: "Tramas y MAC", x: 82, y: 274, width: 228, height: 32 },
  { id: "osi-l1", tone: "access", title: "Fisica", subtitle: "Bits en el medio", x: 82, y: 310, width: 228, height: 32 },
] as const

const TCP_LAYERS = [
  { id: "tcp-l4", tone: "app", title: "Aplicacion", subtitle: "L7 + L6 + L5", x: 492, y: 98, width: 226, height: 62 },
  { id: "tcp-l3", tone: "transport", title: "Transporte", subtitle: "TCP / UDP", x: 492, y: 170, width: 226, height: 50 },
  { id: "tcp-l2", tone: "internet", title: "Internet", subtitle: "IP", x: 492, y: 230, width: 226, height: 50 },
  { id: "tcp-l1", tone: "access", title: "Acceso a red", subtitle: "Enlace + Fisica", x: 492, y: 290, width: 226, height: 56 },
] as const

const GROUP_BANDS = [
  {
    id: "group-app",
    tone: "app",
    label: "L7-L5 -> App",
    x: 70,
    y: 76,
    width: 252,
    height: 116,
    lineX1: 310,
    lineY1: centerY(76, 116),
    lineX2: 492,
    lineY2: centerY(98, 62),
  },
  {
    id: "group-transport",
    tone: "transport",
    label: "L4 -> Transp.",
    x: 70,
    y: 188,
    width: 252,
    height: 44,
    lineX1: 310,
    lineY1: centerY(194, 32),
    lineX2: 492,
    lineY2: centerY(170, 50),
  },
  {
    id: "group-internet",
    tone: "internet",
    label: "L3 -> Internet",
    x: 70,
    y: 228,
    width: 252,
    height: 44,
    lineX1: 310,
    lineY1: centerY(234, 32),
    lineX2: 492,
    lineY2: centerY(230, 50),
  },
  {
    id: "group-access",
    tone: "access",
    label: "L2-L1 -> Acceso",
    x: 70,
    y: 268,
    width: 252,
    height: 82,
    lineX1: 310,
    lineY1: centerY(268, 82),
    lineX2: 492,
    lineY2: centerY(290, 56),
  },
] as const

const MAPPING_LINES = [
  {
    id: "map-l7-app",
    tone: "app",
    className: "mapping-line app-mapping-line",
    x1: 310,
    y1: centerY(82, 32),
    x2: 492,
    y2: centerY(98, 62) - 16,
  },
  {
    id: "map-l6-app",
    tone: "app",
    className: "mapping-line app-mapping-line",
    x1: 310,
    y1: centerY(118, 32),
    x2: 492,
    y2: centerY(98, 62),
  },
  {
    id: "map-l5-app",
    tone: "app",
    className: "mapping-line app-mapping-line",
    x1: 310,
    y1: centerY(154, 32),
    x2: 492,
    y2: centerY(98, 62) + 16,
  },
  {
    id: "map-l4-transport",
    tone: "transport",
    className: "mapping-line",
    x1: 310,
    y1: centerY(194, 32),
    x2: 492,
    y2: centerY(170, 50),
  },
  {
    id: "map-l3-internet",
    tone: "internet",
    className: "mapping-line",
    x1: 310,
    y1: centerY(234, 32),
    x2: 492,
    y2: centerY(230, 50),
  },
  {
    id: "map-l2-access",
    tone: "access",
    className: "mapping-line access-mapping-line",
    x1: 310,
    y1: centerY(274, 32),
    x2: 492,
    y2: centerY(290, 56) - 12,
  },
  {
    id: "map-l1-access",
    tone: "access",
    className: "mapping-line access-mapping-line",
    x1: 310,
    y1: centerY(310, 32),
    x2: 492,
    y2: centerY(290, 56) + 12,
  },
] as const

const SUMMARY_CARDS = [
  { id: "summary-model", label: "MODELO", text: "OSI explica | TCP/IP implementa", width: 178, tone: "neutral" },
  { id: "summary-grouping", label: "AGRUPA", text: "7 capas en 4 bloques", width: 160, tone: "good" },
  { id: "summary-flow", label: "FLUJO", text: "Bajar = encapsular", width: 146, tone: "warn" },
] as const

const SUMMARY = {
  x: 136,
  y: 410,
  width: 528,
  height: 45,
  gap: 14,
  cardHeight: 35,
} as const

const SUMMARY_CARD_Y = SUMMARY.y + (SUMMARY.height - SUMMARY.cardHeight) / 2

const OSI_PACKET_POINTS = {
  app: { x: 196, y: centerY(82, 32) },
  transport: { x: 196, y: centerY(194, 32) },
  network: { x: 196, y: centerY(234, 32) },
  link: { x: 196, y: centerY(274, 32) },
  physical: { x: 196, y: centerY(310, 32) },
  medium: { x: 196, y: 365 },
} as const

const TCP_PACKET_POINTS = {
  app: { x: 604, y: centerY(98, 62) },
  transport: { x: 604, y: centerY(170, 50) },
  internet: { x: 604, y: centerY(230, 50) },
  access: { x: 604, y: centerY(290, 56) },
  medium: { x: 604, y: 365 },
} as const

function getSummaryCardX(index: number) {
  const totalWidth = SUMMARY_CARDS.reduce((acc, card) => acc + card.width, 0) + SUMMARY.gap * (SUMMARY_CARDS.length - 1)
  const startX = SUMMARY.x + (SUMMARY.width - totalWidth) / 2

  return SUMMARY_CARDS.slice(0, index).reduce((acc, card) => acc + card.width + SUMMARY.gap, startX)
}

type LayerTone = "app" | "transport" | "internet" | "access"

function PacketStack({
  id,
  fill,
  textColor,
  accent,
}: {
  id: string
  fill: string
  textColor: string
  accent: string
}) {
  return (
    <g id={id} pointerEvents="none">
      <rect x="-42" y="-14" width="84" height="28" rx="14" fill={fill} stroke={accent} strokeWidth="1.2" />
      <rect className="packet-shell packet-segment" x="-50" y="-20" width="100" height="40" rx="16" fill="none" stroke={accent} strokeWidth="1.4" />
      <rect className="packet-shell packet-ip" x="-58" y="-26" width="116" height="52" rx="18" fill="none" stroke={accent} strokeWidth="1.4" />
      <rect className="packet-shell packet-frame" x="-66" y="-32" width="132" height="64" rx="20" fill="none" stroke={accent} strokeWidth="1.4" />
      <text className="packet-stage-label packet-data-label" textAnchor="middle" y="4" fill={textColor} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
        DATOS
      </text>
      <text className="packet-stage-label packet-segment-label" textAnchor="middle" y="4" fill={textColor} fontSize="8" fontWeight="800" fontFamily="var(--font-mono)">
        SEGMENTO
      </text>
      <text className="packet-stage-label packet-ip-label" textAnchor="middle" y="4" fill={textColor} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
        IP
      </text>
      <text className="packet-stage-label packet-frame-label" textAnchor="middle" y="4" fill={textColor} fontSize="8.5" fontWeight="800" fontFamily="var(--font-mono)">
        TRAMA
      </text>
      <text className="packet-stage-label packet-bits-label" textAnchor="middle" y="4" fill={textColor} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
        BITS
      </text>
    </g>
  )
}

export function OsiTcpIpAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()

  const C =
    resolvedTheme === "light"
      ? {
        bg: "#F8FAFC",
        panel: "#FFFFFF",
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
        map: "#2563EB",
        mapSoft: "#BFDBFE",
        app: "#C2410C",
        appFill: "#FFEDD5",
        transport: "#2563EB",
        transportFill: "#DBEAFE",
        internet: "#7C3AED",
        internetFill: "#EDE9FE",
        access: "#0F766E",
        accessFill: "#CCFBF1",
        tagFill: "#E2E8F0",
        tagText: "#0F172A",
        good: "#047857",
        warn: "#B45309",
      }
      : {
        bg: "#0F172A",
        panel: "#111827",
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
        map: "#38BDF8",
        mapSoft: "#164E63",
        app: "#FB923C",
        appFill: "#4A2C16",
        transport: "#60A5FA",
        transportFill: "#172554",
        internet: "#C4B5FD",
        internetFill: "#2E1065",
        access: "#2DD4BF",
        accessFill: "#0F3C39",
        tagFill: "#1E293B",
        tagText: "#E2E8F0",
        good: "#34D399",
        warn: "#FBBF24",
      }

  const layerColor = (tone: LayerTone) => {
    switch (tone) {
      case "app":
        return { stroke: C.app, fill: C.appFill }
      case "transport":
        return { stroke: C.transport, fill: C.transportFill }
      case "internet":
        return { stroke: C.internet, fill: C.internetFill }
      case "access":
        return { stroke: C.access, fill: C.accessFill }
    }
  }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q(".stack-shell"), { stroke: C.shell, strokeWidth: 1.4, opacity: 0.78 })
    gsap.set(q(".stack-title"), { opacity: 0, y: 8 })
    gsap.set(q(".layer-group"), { opacity: 0, y: 10 })
    gsap.set(q(".layer-rect"), { fill: C.bg, stroke: C.idle, strokeWidth: 1.4 })
    gsap.set(q(".group-band, .group-label, .summary-card, #summary-shell, .medium"), { opacity: 0 })
    gsap.set(q(".mapping-line"), { opacity: 0, strokeDashoffset: 1 })
    gsap.set(q("#concept-chip"), { opacity: 0, y: 8 })
    gsap.set(q("#osi-packet"), { opacity: 0, x: OSI_PACKET_POINTS.app.x, y: OSI_PACKET_POINTS.app.y })
    gsap.set(q("#tcp-packet"), { opacity: 0, x: TCP_PACKET_POINTS.app.x, y: TCP_PACKET_POINTS.app.y })
    gsap.set(q(".packet-shell"), { opacity: 0, scaleX: 0.7, scaleY: 0.7, transformOrigin: "center center" })
    gsap.set(q(".packet-stage-label"), { opacity: 0 })
    gsap.set(q(".packet-data-label"), { opacity: 1 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q(".stack-title"), { opacity: 1, y: 0, duration: 0.36, stagger: 0.08, ease: "power2.out" })
      .to(q("#osi-shell"), { opacity: 1, stroke: C.osi, strokeWidth: 2.5, duration: 0.42 }, "<")
      .to(q("#tcp-shell"), { opacity: 1, stroke: C.tcp, strokeWidth: 2.5, duration: 0.42 }, "<")
      .to(q("#concept-chip"), { opacity: 1, y: 0, duration: 0.42, ease: "back.out(1.35)" }, "<0.08")

    tl.addLabel("step-2")
      .to(q(".osi-layer-group"), { opacity: 1, y: 0, duration: 0.28, stagger: 0.06, ease: "power2.out" })
      .to(q(".tone-app .layer-rect"), { fill: C.appFill, stroke: C.app, duration: 0.18 }, "<0.08")
      .to(q(".tone-transport .layer-rect"), { fill: C.transportFill, stroke: C.transport, duration: 0.18 }, "<0.04")
      .to(q(".tone-internet .layer-rect"), { fill: C.internetFill, stroke: C.internet, duration: 0.18 }, "<0.04")
      .to(q(".tone-access .layer-rect"), { fill: C.accessFill, stroke: C.access, duration: 0.18 }, "<0.04")

    tl.addLabel("step-3")
      .to(q(".tcp-layer-group"), { opacity: 1, y: 0, duration: 0.3, stagger: 0.08, ease: "power2.out" })
      .to(q(".tone-app .layer-rect"), { fill: C.appFill, stroke: C.app, duration: 0.22 }, "<0.08")
      .to(q(".tone-transport .layer-rect"), { fill: C.transportFill, stroke: C.transport, duration: 0.22 }, "<0.05")
      .to(q(".tone-internet .layer-rect"), { fill: C.internetFill, stroke: C.internet, duration: 0.22 }, "<0.05")
      .to(q(".tone-access .layer-rect"), { fill: C.accessFill, stroke: C.access, duration: 0.22 }, "<0.05")

    tl.addLabel("step-4")
      .to(q(".group-band"), { opacity: 0.22, duration: 0.24, stagger: 0.08 })
      .to(q(".mapping-line"), { opacity: 1, strokeDashoffset: 0, duration: 0.38, stagger: 0.045, ease: "power2.inOut" }, "<0.05")
      .to(q(".group-label"), { opacity: 1, y: -4, duration: 0.28, stagger: 0.08, ease: "back.out(1.2)" }, "<0.2")

    tl.addLabel("step-5")
      .to(q("#osi-packet, #tcp-packet"), { opacity: 1, duration: 0.12 })
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.transport.y, duration: 0.44, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.transport.y, duration: 0.44, ease: "power2.inOut" }, "<")
      .to(q("#osi-packet .packet-segment, #tcp-packet .packet-segment"), { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 }, "<0.25")
      .to(q(".packet-data-label"), { opacity: 0, duration: 0.08 }, "<")
      .to(q(".packet-segment-label"), { opacity: 1, duration: 0.08 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.network.y, duration: 0.38, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.internet.y, duration: 0.38, ease: "power2.inOut" }, "<")
      .to(q("#osi-packet .packet-ip, #tcp-packet .packet-ip"), { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 }, "<0.2")
      .to(q(".packet-segment-label"), { opacity: 0, duration: 0.08 }, "<")
      .to(q(".packet-ip-label"), { opacity: 1, duration: 0.08 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.link.y, duration: 0.38, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.access.y, duration: 0.38, ease: "power2.inOut" }, "<")
      .to(q("#osi-packet .packet-frame, #tcp-packet .packet-frame"), { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 }, "<0.2")
      .to(q(".packet-ip-label"), { opacity: 0, duration: 0.08 }, "<")
      .to(q(".packet-frame-label"), { opacity: 1, duration: 0.08 }, "<")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.physical.y, duration: 0.28, ease: "power2.inOut" })
      .to(q("#osi-packet .packet-frame-label"), { opacity: 0, duration: 0.08 }, "<")
      .to(q("#osi-packet .packet-bits-label"), { opacity: 1, duration: 0.08 }, "<")
      .to(q(".medium"), { opacity: 1, duration: 0.2 }, "<0.08")
      .to(q("#osi-packet"), { y: OSI_PACKET_POINTS.medium.y, duration: 0.26, ease: "power2.inOut" })
      .to(q("#tcp-packet"), { y: TCP_PACKET_POINTS.medium.y, duration: 0.26, ease: "power2.inOut" }, "<")
      .to(q("#osi-packet, #tcp-packet"), { opacity: 0, duration: 0.18 })

    tl.addLabel("step-6")
      .to(q("#summary-shell"), { opacity: 1, duration: 0.22 })
      .to(q(".summary-card"), { opacity: 1, y: -8, duration: 0.34, stagger: 0.08, ease: "back.out(1.2)" })
      .to(q(".stack-shell"), { strokeWidth: 2.8, duration: 0.2 }, "<")

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
    C.app,
    C.appFill,
    C.transport,
    C.transportFill,
    C.internet,
    C.internetFill,
    C.access,
    C.accessFill,
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

      <g opacity="0.28">
        <circle cx="90" cy="40" r="30" fill={C.osiFill} />
        <circle cx="714" cy="44" r="36" fill={C.tcpFill} />
        <circle cx="400" cy="410" r="50" fill={C.activeFill} />
      </g>

      <g className="stack-title">
        <text x="82" y="34" fill={C.osi} fontSize="18" fontWeight="800" fontFamily="var(--font-mono)">
          MODELO OSI
        </text>
        <text x="82" y="50" fill={C.subText} fontSize="11" fontFamily="var(--font-mono)">
          7 capas para estudiar y diagnosticar
        </text>
      </g>

      <g className="stack-title">
        <text x="492" y="34" fill={C.tcp} fontSize="18" fontWeight="800" fontFamily="var(--font-mono)">
          MODELO TCP/IP
        </text>
        <text x="492" y="50" fill={C.subText} fontSize="11" fontFamily="var(--font-mono)">
          4 bloques usados en Internet real
        </text>
      </g>

      <rect id="osi-shell" className="stack-shell" x="62" y="68" width="268" height="288" rx="26" fill="none" stroke={C.shell} />
      <rect id="tcp-shell" className="stack-shell" x="480" y="84" width="250" height="272" rx="26" fill="none" stroke={C.shell} />

      {GROUP_BANDS.map((band) => (
        <g key={band.id}>
          <rect
            className="group-band"
            x={band.x}
            y={band.y}
            width={band.width}
            height={band.height}
            rx="18"
            fill={layerColor(band.tone).stroke}
          />
        </g>
      ))}

      {MAPPING_LINES.map((line) => (
        <line
          key={line.id}
          className={line.className}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          pathLength="1"
          stroke={layerColor(line.tone).stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="1"
        />
      ))}

      {GROUP_BANDS.map((band) => (
        <g key={`${band.id}-label`} className="group-label" transform="translate(0 4)">
          <rect x="346" y={band.lineY1 - 9} width="106" height="18" rx="9" fill={C.tagFill} stroke={layerColor(band.tone).stroke} />
          <text x="399" y={band.lineY1 + 3} textAnchor="middle" fill={layerColor(band.tone).stroke} fontSize="7.2" fontWeight="800" fontFamily="var(--font-mono)">
            {band.label}
          </text>
        </g>
      ))}

      {OSI_LAYERS.map((layer, index) => (
        <g key={layer.id} className={`layer-group osi-layer-group tone-${layer.tone}`}>
          <rect
            id={layer.id}
            className="layer-rect osi-layer"
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            rx="12"
            fill={C.bg}
            stroke={layerColor(layer.tone).stroke}
          />
          <text x={layer.x + 14} y={layer.y + 14} fill={C.subText} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
            L{7 - index}
          </text>
          <text x={layer.x + 54} y={layer.y + 14} fill={C.text} fontSize="12" fontWeight="800">
            {layer.title}
          </text>
          <text x={layer.x + 54} y={layer.y + 26} fill={C.subText} fontSize="9.5" fontFamily="var(--font-mono)">
            {layer.subtitle}
          </text>
        </g>
      ))}

      {TCP_LAYERS.map((layer, index) => (
        <g key={layer.id} className={`layer-group tcp-layer-group tone-${layer.tone}`}>
          <rect
            id={layer.id}
            className="layer-rect tcp-layer"
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
            rx="16"
            fill={C.bg}
            stroke={layerColor(layer.tone).stroke}
          />
          <text x={layer.x + 14} y={layer.y + 20} fill={C.subText} fontSize="9" fontWeight="800" fontFamily="var(--font-mono)">
            C{4 - index}
          </text>
          <text x={layer.x + 58} y={layer.y + 22} fill={C.text} fontSize="13" fontWeight="800">
            {layer.title}
          </text>
          <text x={layer.x + 58} y={layer.y + 39} fill={C.subText} fontSize="10" fontFamily="var(--font-mono)">
            {layer.subtitle}
          </text>
        </g>
      ))}

      <g id="concept-chip">
        <rect x="318" y="14" width="164" height="22" rx="11" fill={C.concept} />
        <text x="400" y="28" textAnchor="middle" fill={C.conceptText} fontSize="8.2" fontWeight="800" fontFamily="var(--font-mono)">
          CAPAS = ROLES SEPARADOS
        </text>
      </g>

      <PacketStack id="osi-packet" fill={C.concept} textColor={C.conceptText} accent={C.osi} />
      <PacketStack id="tcp-packet" fill={C.concept} textColor={C.conceptText} accent={C.tcp} />

      <g className="medium">
        <line x1="120" y1="368" x2="272" y2="368" stroke={C.osi} strokeWidth="4" strokeLinecap="round" />
        <text x="196" y="378" textAnchor="middle" fill={C.subText} fontSize="9.5" fontFamily="var(--font-mono)">
          Medio fisico
        </text>
      </g>
      <g className="medium">
        <line x1="528" y1="368" x2="680" y2="368" stroke={C.tcp} strokeWidth="4" strokeLinecap="round" />
        <text x="604" y="378" textAnchor="middle" fill={C.subText} fontSize="9.5" fontFamily="var(--font-mono)">
          Medio fisico
        </text>
      </g>

      <g id="summary-shell">
        <rect x={SUMMARY.x} y={SUMMARY.y} width={SUMMARY.width} height={SUMMARY.height} rx="22" fill={C.panel} stroke={C.shell} />
      </g>

      {SUMMARY_CARDS.map((card, index) => {
        const x = getSummaryCardX(index)
        const centerX = x + card.width / 2
        const tone = card.tone === "good" ? C.good : card.tone === "warn" ? C.warn : C.map

        return (
          <g key={card.id} className="summary-card" transform="translate(0 8)">
            <rect
              x={x}
              y={SUMMARY_CARD_Y + 7}
              width={card.width}
              height={SUMMARY.cardHeight}
              rx={SUMMARY.cardHeight / 2}
              fill={C.panel}
              stroke={tone}
              strokeWidth="1.2"
            />
            <text x={centerX} y={SUMMARY_CARD_Y + 18} textAnchor="middle" fill={tone} fontSize="7.8" fontWeight="800" fontFamily="var(--font-mono)">
              {card.label}
            </text>
            <text x={centerX} y={SUMMARY_CARD_Y + 30} textAnchor="middle" fill={C.text} fontSize="9.1" fontWeight="700">
              {card.text}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
