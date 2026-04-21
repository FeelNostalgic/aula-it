"use client"

import { useEffect, useRef, useState } from "react"

export function useNodeTooltip() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  return {
    selectedNode,
    handleNodeEnter,
    scheduleHide,
    cancelHide,
  }
}
