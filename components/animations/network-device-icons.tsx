interface NetworkDeviceGlyphProps {
  stroke: string
  strokeWidth?: number
}

export const NETWORK_DEVICE_STYLE = {
  pc: {
    radius: 36,
    labelOffsetY: 54,
    pulseRadius: 50,
  },
  server: {
    radius: 38,
    labelOffsetY: 56,
  },
  switch: {
    radius: 38,
    labelOffsetY: 56,
  },
  router: {
    radius: 40,
    labelOffsetY: 60,
  },
} as const

export function PcGlyph({ stroke, strokeWidth = 1.5 }: NetworkDeviceGlyphProps) {
  return (
    <>
      <rect x="-16" y="-12" width="32" height="20" rx="2" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <line x1="-6" y1="8" x2="6" y2="8" stroke={stroke} strokeWidth={strokeWidth} />
      <line x1="-12" y1="13" x2="12" y2="13" stroke={stroke} strokeWidth={strokeWidth} />
    </>
  )
}

export function SwitchGlyph({ stroke, strokeWidth = 1.5 }: NetworkDeviceGlyphProps) {
  return (
    <>
      <rect x="-18" y="-10" width="36" height="20" rx="4" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx="-8" cy="0" r="2.3" fill={stroke} />
      <circle cx="0" cy="0" r="2.3" fill={stroke} />
      <circle cx="8" cy="0" r="2.3" fill={stroke} />
    </>
  )
}

export function ServerGlyph({ stroke, strokeWidth = 1.5 }: NetworkDeviceGlyphProps) {
  return (
    <>
      <rect x="-18" y="-16" width="36" height="12" rx="3" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="-18" y="4" width="36" height="12" rx="3" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx="-10" cy="-10" r="1.8" fill={stroke} />
      <circle cx="-4" cy="-10" r="1.8" fill={stroke} />
      <circle cx="-10" cy="10" r="1.8" fill={stroke} />
      <circle cx="-4" cy="10" r="1.8" fill={stroke} />
      <line x1="4" y1="-10" x2="12" y2="-10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="4" y1="10" x2="12" y2="10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </>
  )
}

export function RouterGlyph({ stroke, strokeWidth = 1.5 }: NetworkDeviceGlyphProps) {
  return (
    <>
      <circle cx="0" cy="0" r="8" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <line x1="-18" y1="0" x2="-8" y2="0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="0" x2="18" y2="0" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="-18" x2="0" y2="-8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="0" y1="8" x2="0" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M -8 -3 L -3 0 L -8 3" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 8 -3 L 3 0 L 8 3" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M -3 -8 L 0 -3 L 3 -8" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M -3 8 L 0 3 L 3 8" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}
