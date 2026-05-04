import { describe, expect, it } from "vitest"
import {
  PLAYBACK_SLOWDOWN_FACTOR,
  PLAYBACK_SPEED_OPTIONS,
  resolvePlaybackSpeed,
} from "@/lib/animations/playback"

describe("animation playback speeds", () => {
  it("keeps the slowdown factor at 0.4 for a much slower playback", () => {
    expect(PLAYBACK_SLOWDOWN_FACTOR).toBe(0.4)
  })

  it("keeps the visible labels while using slowed internal values", () => {
    expect(PLAYBACK_SPEED_OPTIONS.map((option) => option.label)).toEqual([0.25, 0.5, 1, 1.5])
    expect(PLAYBACK_SPEED_OPTIONS[0].value).toBeCloseTo(0.1)
    expect(PLAYBACK_SPEED_OPTIONS[1].value).toBeCloseTo(0.2)
    expect(PLAYBACK_SPEED_OPTIONS[2].value).toBeCloseTo(0.4)
    expect(PLAYBACK_SPEED_OPTIONS[3].value).toBeCloseTo(0.6)
  })

  it("resolves known labels to their slowed playback values", () => {
    expect(resolvePlaybackSpeed(0.25)).toBeCloseTo(0.1)
    expect(resolvePlaybackSpeed(0.5)).toBeCloseTo(0.2)
    expect(resolvePlaybackSpeed(1)).toBeCloseTo(0.4)
    expect(resolvePlaybackSpeed(1.5)).toBeCloseTo(0.6)
  })

  it("falls back to slowing unknown labels by the same factor", () => {
    expect(resolvePlaybackSpeed(2)).toBeCloseTo(0.8)
  })
})
