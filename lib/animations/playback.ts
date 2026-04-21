export const PLAYBACK_SLOWDOWN_FACTOR = 0.5

export const PLAYBACK_SPEED_OPTIONS = [
  {
    label: 0.25,
    value: 0.25 * PLAYBACK_SLOWDOWN_FACTOR,
  },
  {
    label: 0.5,
    value: 0.5 * PLAYBACK_SLOWDOWN_FACTOR,
  },
  {
    label: 1,
    value: 1 * PLAYBACK_SLOWDOWN_FACTOR,
  },
  {
    label: 1.5,
    value: 1.5 * PLAYBACK_SLOWDOWN_FACTOR,
  },
] as const

export type PlaybackSpeedLabel = (typeof PLAYBACK_SPEED_OPTIONS)[number]["label"]

export function resolvePlaybackSpeed(label: number) {
  const matchedOption = PLAYBACK_SPEED_OPTIONS.find((option) => option.label === label)
  return matchedOption?.value ?? label * PLAYBACK_SLOWDOWN_FACTOR
}
