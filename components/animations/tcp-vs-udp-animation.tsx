"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useTheme } from "next-themes"
import { useAnimationContext } from "./animation-player"
import { NETWORK_DEVICE_STYLE, PcGlyph, ServerGlyph } from "./network-device-icons"
import { PacketPill } from "./network-visual-primitives"

const VIEWBOX = { width: 800, height: 460 }

const LEFT = {
  client: { x: 112, y: 188 },
  server: { x: 252, y: 188 },
} as const

const RIGHT = {
  client: { x: 548, y: 188 },
  server: { x: 688, y: 188 },
} as const

export function TcpVsUdpAnimation() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { registerTimeline } = useAnimationContext()
  const { resolvedTheme } = useTheme()

  const C =
    resolvedTheme === "light"
      ? {
        bg: "#E5EAF0",
        fg: "#0F172A",
        idle: "#94A3B8",
        tcp: "#2563EB",
        udp: "#D97706",
        success: "#059669",
        panel: "#FFFFFF",
        subText: "#475569",
        tcpFill: "#DBEAFE",
        tcpText: "#1D4ED8",
        udpFill: "#FEF3C7",
        udpText: "#92400E",
        goodFill: "#DCFCE7",
        goodText: "#047857",
        badFill: "#FEE2E2",
        badText: "#B91C1C",
      }
      : {
        bg: "#1F2937",
        fg: "#E5E7EB",
        idle: "#64748B",
        tcp: "#38BDF8",
        udp: "#FBBF24",
        success: "#34D399",
        panel: "#111827",
        subText: "#A3B0C2",
        tcpFill: "#172554",
        tcpText: "#BFDBFE",
        udpFill: "#78350F",
        udpText: "#FDE68A",
        goodFill: "#052E2B",
        goodText: "#A7F3D0",
        badFill: "#450A0A",
        badText: "#FCA5A5",
      }

  useEffect(() => {
    if (!svgRef.current) return
    const q = gsap.utils.selector(svgRef)

    gsap.set(q("#tcp-client"), { x: LEFT.client.x, y: LEFT.client.y })
    gsap.set(q("#tcp-server"), { x: LEFT.server.x, y: LEFT.server.y })
    gsap.set(q("#udp-client"), { x: RIGHT.client.x, y: RIGHT.client.y })
    gsap.set(q("#udp-server"), { x: RIGHT.server.x, y: RIGHT.server.y })
    gsap.set(q(".lane-shell"), { opacity: 0.78 })
    gsap.set(q(".lane-note, .use-card, #summary-row"), { opacity: 0, y: 8 })
    gsap.set(q("#tcp-syn"), { x: LEFT.client.x, y: LEFT.client.y, opacity: 0 })
    gsap.set(q("#udp-dgram"), { x: RIGHT.client.x, y: RIGHT.client.y, opacity: 0 })
    gsap.set(q("#tcp-ack"), { x: LEFT.server.x, y: LEFT.server.y, opacity: 0 })

    const tl = gsap.timeline({ paused: true })

    tl.addLabel("step-1")
      .to(q("#lane-tcp"), { stroke: C.tcp, strokeWidth: 2.2, duration: 0.55 })
      .to(q("#lane-udp"), { stroke: C.udp, strokeWidth: 2.2, duration: 0.55 }, "<")

    tl.addLabel("step-2")
      .to(q("#tcp-syn"), { opacity: 1, duration: 0.08 })
      .to(q("#tcp-syn"), { x: LEFT.server.x, y: LEFT.server.y, duration: 1.35, ease: "power2.inOut" })
      .to(q("#tcp-syn"), { opacity: 0, duration: 0.08 })
      .to(q("#lane-note-handshake"), { opacity: 1, y: 0, duration: 0.48 }, "<0.08")
      .to(q("#udp-dgram"), { opacity: 1, duration: 0.08 }, "<")
      .to(q("#udp-dgram"), { x: RIGHT.server.x, y: RIGHT.server.y, duration: 1.28, ease: "power2.inOut" }, "<")
      .to(q("#lane-note-direct"), { opacity: 1, y: 0, duration: 0.48 }, "<0.08")

    tl.addLabel("step-3")
      .to(q("#tcp-ack"), { opacity: 1, duration: 0.08 })
      .to(q("#tcp-ack"), { x: LEFT.client.x, y: LEFT.client.y, duration: 1.25, ease: "power2.inOut" })
      .to(q("#tcp-ack"), { opacity: 0, duration: 0.08 })
      .to(q("#lane-note-ack"), { opacity: 1, y: 0, duration: 0.48 }, "<0.08")
      .to(q("#lane-note-noack"), { opacity: 1, y: 0, duration: 0.48 }, "<")

    tl.addLabel("step-4")
      .to(q("#control-card"), { opacity: 1, y: 0, duration: 0.55 })

    tl.addLabel("step-5")
      .to(q(".use-card"), { opacity: 1, y: 0, duration: 0.56, stagger: 0.18, ease: "back.out(1.2)" })

    tl.addLabel("step-6")
      .to(q("#summary-row"), { opacity: 1, y: 0, duration: 0.58, ease: "back.out(1.2)" })

    registerTimeline(tl)
    return () => {
      tl.kill()
    }
  }, [C.tcp, C.udp, registerTimeline])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect id="lane-tcp" className="lane-shell" x="32" y="58" width="300" height="268" rx="24" fill="none" stroke={C.idle} strokeWidth="1.4" />
      <rect id="lane-udp" className="lane-shell" x="468" y="58" width="300" height="268" rx="24" fill="none" stroke={C.idle} strokeWidth="1.4" />

      <text x="182" y="38" textAnchor="middle" fill={C.tcp} fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
        TCP
      </text>
      <text x="182" y="52" textAnchor="middle" fill={C.subText} fontSize="10" fontFamily="var(--font-mono)">
        Orientado a conexión
      </text>
      <text x="618" y="38" textAnchor="middle" fill={C.udp} fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
        UDP
      </text>
      <text x="618" y="52" textAnchor="middle" fill={C.subText} fontSize="10" fontFamily="var(--font-mono)">
        Sin conexión previa
      </text>

      <line x1={LEFT.client.x} y1={LEFT.client.y} x2={LEFT.server.x} y2={LEFT.server.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />
      <line x1={RIGHT.client.x} y1={RIGHT.client.y} x2={RIGHT.server.x} y2={RIGHT.server.y} stroke={C.idle} strokeWidth="1.6" strokeDasharray="6 4" />

      <g id="tcp-client">
        <circle r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <PcGlyph stroke={C.fg} />
        <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
          Cliente
        </text>
      </g>

      <g id="tcp-server">
        <circle r={NETWORK_DEVICE_STYLE.server.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <ServerGlyph stroke={C.fg} />
        <text y={NETWORK_DEVICE_STYLE.server.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
          Servidor
        </text>
      </g>

      <g id="udp-client">
        <circle r={NETWORK_DEVICE_STYLE.pc.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <PcGlyph stroke={C.fg} />
        <text y={NETWORK_DEVICE_STYLE.pc.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
          Cliente
        </text>
      </g>

      <g id="udp-server">
        <circle r={NETWORK_DEVICE_STYLE.server.radius} fill={C.bg} stroke={C.idle} strokeWidth="1.5" />
        <ServerGlyph stroke={C.fg} />
        <text y={NETWORK_DEVICE_STYLE.server.labelOffsetY} textAnchor="middle" fill={C.fg} fontSize="12.5" fontWeight="600" fontFamily="var(--font-mono)">
          Servidor
        </text>
      </g>

      <g id="lane-note-handshake" className="lane-note" pointerEvents="none">
        <rect x="74" y="254" width="216" height="24" rx="12" fill={C.tcpFill} />
        <text x="182" y="269" textAnchor="middle" fill={C.tcpText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          TCP abre sesión antes de enviar
        </text>
      </g>

      <g id="lane-note-direct" className="lane-note" pointerEvents="none">
        <rect x="506" y="254" width="224" height="24" rx="12" fill={C.udpFill} />
        <text x="618" y="269" textAnchor="middle" fill={C.udpText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          UDP envía directo sin handshake
        </text>
      </g>

      <g id="lane-note-ack" className="lane-note" pointerEvents="none">
        <rect x="80" y="284" width="204" height="24" rx="12" fill={C.goodFill} />
        <text x="182" y="299" textAnchor="middle" fill={C.goodText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          TCP confirma con ACK
        </text>
      </g>

      <g id="lane-note-noack" className="lane-note" pointerEvents="none">
        <rect x="502" y="284" width="232" height="24" rx="12" fill={C.badFill} />
        <text x="618" y="299" textAnchor="middle" fill={C.badText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          UDP no confirma recepción
        </text>
      </g>

      <g id="control-card" pointerEvents="none">
        <rect x="250" y="340" width="300" height="32" rx="16" fill={C.panel} stroke={C.success} strokeWidth="1.4" />
        <text x="400" y="360" textAnchor="middle" fill={C.fg} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">
          TCP = MAS CONTROL | UDP = MAS LIGEREZA
        </text>
      </g>

      <g id="tcp-use" className="use-card" pointerEvents="none">
        <rect x="58" y="386" width="248" height="30" rx="15" fill={C.tcpFill} />
        <text x="182" y="405" textAnchor="middle" fill={C.tcpText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          TCP: web, correo, archivos
        </text>
      </g>

      <g id="udp-use" className="use-card" pointerEvents="none">
        <rect x="494" y="386" width="248" height="30" rx="15" fill={C.udpFill} />
        <text x="618" y="405" textAnchor="middle" fill={C.udpText} fontSize="8.5" fontWeight="700" fontFamily="var(--font-mono)">
          UDP: DNS, voz, streaming, juegos
        </text>
      </g>

      <g id="summary-row" pointerEvents="none">
        <rect x="122" y="422" width="556" height="28" rx="14" fill={C.panel} stroke={C.idle} strokeWidth="1.2" />
        <text x="400" y="440" textAnchor="middle" fill={C.fg} fontSize="8.3" fontWeight="700" fontFamily="var(--font-mono)">
          REGLA RPIDA: SI QUIERES FIABILIDAD, TCP. SI QUIERES SIMPLICIDAD Y RAPIDEZ, UDP.
        </text>
      </g>

      <g id="tcp-syn" pointerEvents="none">
        <PacketPill label="SYN" fill={C.tcpFill} textColor={C.tcpText} width={62} />
      </g>

      <g id="tcp-ack" pointerEvents="none">
        <PacketPill label="ACK" fill={C.goodFill} textColor={C.goodText} width={62} />
      </g>

      <g id="udp-dgram" pointerEvents="none">
        <PacketPill label="UDP" fill={C.udpFill} textColor={C.udpText} width={64} />
      </g>
    </svg>
  )
}
