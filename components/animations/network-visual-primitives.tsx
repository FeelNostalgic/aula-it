interface CloudGlyphProps {
  className?: string
  fill: string
  stroke: string
  strokeWidth?: number
}

interface PacketPillProps {
  label: string
  fill: string
  textColor: string
  width?: number
  height?: number
  radius?: number
  stroke?: string
  strokeWidth?: number
}

export function CloudGlyph({
  className,
  fill,
  stroke,
  strokeWidth = 1.6,
}: CloudGlyphProps) {
  return (
    <path
      className={className}
      d="M -56 16 C -70 16 -82 6 -82 -10 C -82 -24 -72 -35 -58 -37 C -52 -54 -36 -66 -18 -66 C 2 -66 19 -53 24 -34 C 27 -35 30 -35 34 -35 C 50 -35 64 -22 64 -5 C 78 -3 88 9 88 24 C 88 40 75 52 58 52 H -56 C -74 52 -88 38 -88 20 C -88 2 -75 -12 -58 -12 H -54"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export function PacketPill({
  label,
  fill,
  textColor,
  width = 72,
  height = 22,
  radius = 11,
  stroke,
  strokeWidth = 1,
}: PacketPillProps) {
  return (
    <>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? strokeWidth : undefined}
      />
      <text
        textAnchor="middle"
        y="3.5"
        fill={textColor}
        fontSize="8.5"
        fontWeight="700"
        fontFamily="var(--font-mono)"
        letterSpacing="0.2px"
      >
        {label}
      </text>
    </>
  )
}
