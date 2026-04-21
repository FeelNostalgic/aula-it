"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface NodeInfo {
  id: string
  label: string
  ip?: string
  mac?: string
  mask?: string
  gateway?: string
  facts?: { label: string; value: string }[]
  arpTable?: { ip: string; mac: string; iface: string }[]
  macTable?: { mac: string; port: string }[]
  routingTable?: { dest: string; mask: string; gateway: string; iface: string }[]
}

interface NodeInfoCardProps {
  node: NodeInfo
  anchorX: number
  anchorY: number
  viewBoxW: number
  viewBoxH: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function NodeInfoCard({
  node,
  anchorX,
  anchorY,
  viewBoxW,
  viewBoxH,
  onMouseEnter,
  onMouseLeave,
}: NodeInfoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const cardElement = cardRef.current
    const containerElement = cardElement?.offsetParent as HTMLElement | null
    if (!containerElement) return

    const updateSize = () => {
      setContainerSize({
        width: containerElement.clientWidth,
        height: containerElement.clientHeight,
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerElement)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const hasMeasuredContainer = containerSize.width > 0 && containerSize.height > 0
  const renderScale = hasMeasuredContainer
    ? Math.min(containerSize.width / viewBoxW, containerSize.height / viewBoxH)
    : 1

  const renderedWidth = hasMeasuredContainer ? viewBoxW * renderScale : 0
  const renderedHeight = hasMeasuredContainer ? viewBoxH * renderScale : 0
  const offsetX = hasMeasuredContainer ? (containerSize.width - renderedWidth) / 2 : 0
  const offsetY = hasMeasuredContainer ? (containerSize.height - renderedHeight) / 2 : 0
  const leftPx = hasMeasuredContainer ? offsetX + (anchorX / viewBoxW) * renderedWidth : 0
  const topPx = hasMeasuredContainer ? offsetY + (anchorY / viewBoxH) * renderedHeight : 0
  const tooltipGapPx = hasMeasuredContainer
    ? Math.max(8, Math.min(16, renderScale * 12))
    : 8

  return (
    <motion.div
      ref={cardRef}
      key={node.id}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "absolute",
        left: `${leftPx}px`,
        top: `${topPx}px`,
        transform: `translate(${tooltipGapPx}px, ${tooltipGapPx}px)`,
        zIndex: 10,
      }}
      className="w-52 rounded-lg border border-border bg-card/97 backdrop-blur-sm shadow-xl text-xs font-mono pointer-events-auto overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <div className="size-1.5 rounded-full bg-primary" />
        <span className="font-bold text-foreground text-[11px]">{node.label}</span>
      </div>

      <div className="p-3 space-y-2">
        {/* Basic info */}
        {node.ip && (
          <Row label="IP" value={`${node.ip}${node.mask ? `/${node.mask}` : ""}`} />
        )}
        {node.mac && <Row label="MAC" value={node.mac} highlight />}
        {node.gateway && <Row label="GW" value={node.gateway} />}
        {node.facts?.map((fact) => (
          <Row key={`${node.id}-${fact.label}`} label={fact.label} value={fact.value} />
        ))}

        {/* ARP Table */}
        {node.arpTable && node.arpTable.length > 0 && (
          <TableSection title="Tabla ARP">
            <thead>
              <tr className="text-muted-foreground text-[9px]">
                <th className="text-left font-normal pb-0.5 w-[45%]">IP</th>
                <th className="text-left font-normal pb-0.5">MAC</th>
              </tr>
            </thead>
            <tbody>
              {node.arpTable.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "text-foreground" : "text-muted-foreground"}>
                  <td className="pr-1 py-0.5 truncate max-w-[80px]">{row.ip}</td>
                  <td className="py-0.5 truncate">{row.mac}</td>
                </tr>
              ))}
            </tbody>
          </TableSection>
        )}

        {/* MAC / CAM Table (switches) */}
        {node.macTable && node.macTable.length > 0 && (
          <TableSection title="Tabla MAC (CAM)">
            <thead>
              <tr className="text-muted-foreground text-[9px]">
                <th className="text-left font-normal pb-0.5">MAC</th>
                <th className="text-left font-normal pb-0.5 w-12">Puerto</th>
              </tr>
            </thead>
            <tbody>
              {node.macTable.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "text-foreground" : "text-muted-foreground"}>
                  <td className="pr-2 py-0.5">{row.mac}</td>
                  <td className="py-0.5 text-primary">{row.port}</td>
                </tr>
              ))}
            </tbody>
          </TableSection>
        )}

        {/* Routing Table */}
        {node.routingTable && node.routingTable.length > 0 && (
          <TableSection title="Tabla de enrutamiento">
            <thead>
              <tr className="text-muted-foreground text-[9px]">
                <th className="text-left font-normal pb-0.5">Red</th>
                <th className="text-left font-normal pb-0.5">GW</th>
                <th className="text-left font-normal pb-0.5 w-8">If.</th>
              </tr>
            </thead>
            <tbody>
              {node.routingTable.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "text-foreground" : "text-muted-foreground"}>
                  <td className="pr-1 py-0.5 truncate max-w-[72px]">{row.dest}/{row.mask}</td>
                  <td className="pr-1 py-0.5 truncate max-w-[60px]">{row.gateway || "—"}</td>
                  <td className="py-0.5">{row.iface}</td>
                </tr>
              ))}
            </tbody>
          </TableSection>
        )}
      </div>
    </motion.div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground text-[9px] uppercase w-7 shrink-0">{label}</span>
      <span className={cn("text-[10px] break-all leading-tight", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  )
}

function TableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-1">
      <p className="text-primary uppercase tracking-wider text-[9px] mb-1">{title}</p>
      <table className="w-full table-fixed">
        {children}
      </table>
    </div>
  )
}
