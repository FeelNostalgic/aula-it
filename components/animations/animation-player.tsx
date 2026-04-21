"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Repeat, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnimationStep } from "@/types/animations"
import type gsap from "gsap"
import { cn } from "@/lib/utils"
import {
  PLAYBACK_SPEED_OPTIONS,
  type PlaybackSpeedLabel,
  resolvePlaybackSpeed,
} from "@/lib/animations/playback"

// ─── Context ─────────────────────────────────────────────────────────────────

interface AnimationContextValue {
  registerTimeline: (tl: gsap.core.Timeline) => void
}

export const AnimationContext = createContext<AnimationContextValue | null>(null)

export function useAnimationContext() {
  const ctx = useContext(AnimationContext)
  if (!ctx) throw new Error("useAnimationContext must be used inside AnimationPlayer")
  return ctx
}

// ─── Player ──────────────────────────────────────────────────────────────────

interface AnimationPlayerProps {
  steps: AnimationStep[]
  title: string
  children: React.ReactNode
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.25

export function AnimationPlayer({ steps, title, children }: AnimationPlayerProps) {
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const stepTimesRef = useRef<number[]>([])
  const isDraggingRef = useRef(false)
  const loopRef = useRef(false)
  const speedLabelRef = useRef<PlaybackSpeedLabel>(1)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [speedLabel, setSpeedLabel] = useState<PlaybackSpeedLabel>(1)
  const [loop, setLoop] = useState(false)
  const [tlDuration, setTlDuration] = useState(0)
  const [zoom, setZoom] = useState(1)

  const handleZoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  const handleZoomOut = () => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  const handleZoomReset = () => setZoom(1)

  const updateStep = useCallback((time: number) => {
    const times = stepTimesRef.current
    let step = 0
    for (let i = 0; i < times.length; i++) {
      if (time >= times[i] - 0.01) step = i
    }
    setCurrentStep(step)
  }, [])

  const registerTimeline = useCallback(
    (tl: gsap.core.Timeline) => {
      tlRef.current = tl

      // Extract ordered step label times
      const times = Object.entries(tl.labels)
        .filter(([k]) => k.startsWith("step-"))
        .sort((a, b) => Number(a[0].split("-")[1]) - Number(b[0].split("-")[1]))
        .map(([, t]) => t as number)

      stepTimesRef.current = times
      setTlDuration(tl.duration())
      tl.timeScale(resolvePlaybackSpeed(speedLabelRef.current))

      tl.eventCallback("onUpdate", () => {
        if (!isDraggingRef.current) {
          setProgress(tl.progress())
          updateStep(tl.time())
        }
      })

      tl.eventCallback("onComplete", () => {
        if (loopRef.current) {
          tl.seek(0).play()
          setProgress(0)
          setCurrentStep(0)
        } else {
          setIsPlaying(false)
          setProgress(1)
          setCurrentStep(steps.length - 1)
        }
      })
    },
    [steps.length, updateStep]
  )

  useEffect(() => {
    speedLabelRef.current = speedLabel
    tlRef.current?.timeScale(resolvePlaybackSpeed(speedLabel))
  }, [speedLabel])

  // Controls
  const handlePlay = () => {
    if (!tlRef.current) return
    if (tlRef.current.progress() >= 1) tlRef.current.seek(0)
    tlRef.current.play()
    setIsPlaying(true)
  }

  const handlePause = () => {
    tlRef.current?.pause()
    setIsPlaying(false)
  }

  const handlePrev = () => {
    if (!tlRef.current) return
    const times = stepTimesRef.current
    const target = currentStep > 0 ? times[currentStep - 1] : 0
    tlRef.current.pause()
    tlRef.current.seek(target)
    setIsPlaying(false)
    setProgress(tlRef.current.progress())
    updateStep(target)
  }

  const handleNext = () => {
    if (!tlRef.current) return
    const times = stepTimesRef.current
    if (currentStep < times.length - 1) {
      const target = times[currentStep + 1]
      tlRef.current.pause()
      tlRef.current.seek(target)
      setIsPlaying(false)
      setProgress(tlRef.current.progress())
      updateStep(target)
    }
  }

  const handleReset = () => {
    tlRef.current?.pause()
    tlRef.current?.seek(0)
    setIsPlaying(false)
    setProgress(0)
    setCurrentStep(0)
  }

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tlRef.current) return
    isDraggingRef.current = true
    const value = parseFloat(e.target.value)
    tlRef.current.pause()
    tlRef.current.progress(value)
    setProgress(value)
    updateStep(tlRef.current.time())
    setIsPlaying(false)
  }

  const handleScrubEnd = () => {
    isDraggingRef.current = false
  }

  const handleSpeedChange = (label: PlaybackSpeedLabel) => {
    setSpeedLabel(label)
  }

  const handleLoopToggle = () => {
    const next = !loop
    setLoop(next)
    loopRef.current = next
  }

  const activeStep = steps[currentStep]

  return (
    <AnimationContext.Provider value={{ registerTimeline }}>
      <div className="flex flex-col h-full gap-2">

        {/* Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        {/* Animation canvas + zoom overlay */}
        <div className="min-h-0 rounded-lg border border-border/50 bg-card overflow-hidden relative" style={{ flex: "1 1 0", maxHeight: "55vh" }}>
          {/* Zoomed content */}
          <div
            className="w-full h-full"
            style={{
              transform: zoom !== 1 ? `scale(${zoom})` : undefined,
              transformOrigin: "center center",
            }}
          >
            {children}
          </div>

          {/* Zoom controls — overlay top-right */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border border-border/60 bg-card/90 backdrop-blur-sm px-1 py-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="size-3" />
            </button>
            <button
              onClick={handleZoomReset}
              className="h-6 px-1.5 flex items-center justify-center rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[36px]"
            >
              {zoom === 1 ? <Maximize2 className="size-3" /> : `${Math.round(zoom * 100)}%`}
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="size-3" />
            </button>
          </div>
        </div>

        {/* Scrubber */}
        <div className="space-y-3">
          <div className="relative">
            {/* Step markers — absolutely positioned at real timeline proportions */}
            <div className="relative h-4 mb-1">
              {steps.map((step, i) => {
                const pct = tlDuration > 0
                  ? (stepTimesRef.current[i] / tlDuration) * 100
                  : (i / Math.max(steps.length - 1, 1)) * 100
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!tlRef.current) return
                      const t = stepTimesRef.current[i] ?? 0
                      tlRef.current.pause()
                      tlRef.current.seek(t)
                      setCurrentStep(i)
                      setProgress(tlRef.current.progress())
                      setIsPlaying(false)
                    }}
                    title={step.label}
                    style={{ left: `${pct}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 bottom-0 w-2 h-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-150",
                      i <= currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )
              })}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={handleScrub}
              onMouseUp={handleScrubEnd}
              onTouchEnd={handleScrubEnd}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(0,112,243,0.2)]
                [&::-webkit-slider-runnable-track]:rounded-full"
              style={{
                background: `linear-gradient(to right, var(--primary) ${progress * 100}%, var(--border) ${progress * 100}%)`,
              }}
            />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 items-center">
            {/* Left: step indicator dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!tlRef.current) return
                    const t = stepTimesRef.current[i] ?? 0
                    tlRef.current.pause()
                    tlRef.current.seek(t)
                    setCurrentStep(i)
                    setProgress(tlRef.current.progress())
                    setIsPlaying(false)
                  }}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    i === currentStep
                      ? "w-5 h-2 bg-primary"
                      : i < currentStep
                      ? "w-2 h-2 bg-primary/40"
                      : "w-2 h-2 bg-border"
                  )}
                />
              ))}
            </div>

            {/* Center: transport controls */}
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="h-8 w-8"
              >
                <SkipBack className="size-4" />
              </Button>

              <Button
                size="icon"
                onClick={isPlaying ? handlePause : handlePlay}
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className="h-8 w-8"
              >
                <SkipForward className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLoopToggle}
                className={cn(
                  "h-8 w-8 transition-colors",
                  loop ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                title={loop ? "Bucle activado" : "Bucle desactivado"}
              >
                <Repeat className="size-3.5" />
              </Button>
            </div>

            {/* Right: speed */}
            <div className="flex items-center justify-end">
              <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
                {PLAYBACK_SPEED_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleSpeedChange(option.label)}
                    className={cn(
                      "px-2 py-1 text-xs font-mono transition-colors",
                      speedLabel === option.label
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {option.label}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step description */}
        <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">
                {activeStep?.label}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeStep?.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimationContext.Provider>
  )
}
