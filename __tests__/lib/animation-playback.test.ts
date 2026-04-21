import { describe, expect, it } from "vitest"
import {
  PLAYBACK_SLOWDOWN_FACTOR,
  PLAYBACK_SPEED_OPTIONS,
  resolvePlaybackSpeed,
} from "@/lib/animations/playback"

describe("animation playback speeds", () => {
  it("keeps the slowdown factor at 0.75 for a 33% longer duration", () => {
    expect(PLAYBACK_SLOWDOWN_FACTOR).toBe(0.75)
  })

  it("keeps the visible labels while using slowed internal values", () => {
    expect(PLAYBACK_SPEED_OPTIONS).toEqual([
      { label: 0.25, value: 0.1875 },
      { label: 0.5, value: 0.375 },
      { label: 1, value: 0.75 },
      { label: 1.5, value: 1.125 },
    ])
  })

  it("resolves known labels to their slowed playback values", () => {
    expect(resolvePlaybackSpeed(0.25)).toBe(0.1875)
    expect(resolvePlaybackSpeed(0.5)).toBe(0.375)
    expect(resolvePlaybackSpeed(1)).toBe(0.75)
    expect(resolvePlaybackSpeed(1.5)).toBe(1.125)
  })

  it("falls back to slowing unknown labels by the same factor", () => {
    expect(resolvePlaybackSpeed(2)).toBe(1.5)
  })
})
