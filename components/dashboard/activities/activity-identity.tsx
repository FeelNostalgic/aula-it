"use client";

import type { CSSProperties } from "react";
import {
  CheckSquare,
  Code,
  Compass,
  FileText,
  FlaskConical,
  Gamepad2,
  Lightbulb,
  PenTool,
  Puzzle,
  Rocket,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

type IconNodeAttributeMap = Record<string, string>;
type IconNode = readonly [tag: string, attributes: IconNodeAttributeMap];

export const ACTIVITY_IDENTITY_PRESETS = [
  {
    value: "theory",
    label: "Teoria",
    icon: FileText,
    iconNode: [
      ["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
      ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
      ["path", { d: "M10 9H8" }],
      ["path", { d: "M16 13H8" }],
      ["path", { d: "M16 17H8" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: CheckSquare,
    iconNode: [
      ["path", { d: "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" }],
      ["path", { d: "m9 11 3 3L22 4" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "code",
    label: "Codigo",
    icon: Code,
    iconNode: [
      ["path", { d: "m16 18 6-6-6-6" }],
      ["path", { d: "m8 6-6 6 6 6" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "project",
    label: "Proyecto",
    icon: PenTool,
    iconNode: [
      ["path", { d: "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" }],
      ["path", { d: "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" }],
      ["path", { d: "m2.3 2.3 7.286 7.286" }],
      ["circle", { cx: "11", cy: "11", r: "2" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "game",
    label: "Juego",
    icon: Gamepad2,
    iconNode: [
      ["line", { x1: "6", x2: "10", y1: "11", y2: "11" }],
      ["line", { x1: "8", x2: "8", y1: "9", y2: "13" }],
      ["line", { x1: "15", x2: "15.01", y1: "12", y2: "12" }],
      ["line", { x1: "18", x2: "18.01", y1: "10", y2: "10" }],
      ["path", { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "trophy",
    label: "Trofeo",
    icon: Trophy,
    iconNode: [
      ["path", { d: "M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" }],
      ["path", { d: "M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" }],
      ["path", { d: "M18 9h1.5a1 1 0 0 0 0-5H18" }],
      ["path", { d: "M4 22h16" }],
      ["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" }],
      ["path", { d: "M6 9H4.5a1 1 0 0 1 0-5H6" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "rocket",
    label: "Cohete",
    icon: Rocket,
    iconNode: [
      ["path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }],
      ["path", { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09" }],
      ["path", { d: "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" }],
      ["path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "puzzle",
    label: "Puzzle",
    icon: Puzzle,
    iconNode: [
      ["path", { d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "idea",
    label: "Idea",
    icon: Lightbulb,
    iconNode: [
      ["path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }],
      ["path", { d: "M9 18h6" }],
      ["path", { d: "M10 22h4" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "science",
    label: "Ciencia",
    icon: FlaskConical,
    iconNode: [
      ["path", { d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" }],
      ["path", { d: "M6.453 15h11.094" }],
      ["path", { d: "M8.5 2h7" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "explore",
    label: "Explorar",
    icon: Compass,
    iconNode: [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["path", { d: "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" }],
    ] as const satisfies readonly IconNode[],
  },
  {
    value: "target",
    label: "Objetivo",
    icon: Target,
    iconNode: [
      ["circle", { cx: "12", cy: "12", r: "10" }],
      ["circle", { cx: "12", cy: "12", r: "6" }],
      ["circle", { cx: "12", cy: "12", r: "2" }],
    ] as const satisfies readonly IconNode[],
  },
] as const;

export const ACTIVITY_IDENTITY_COLORS = [
  { value: "sky", label: "Cian", className: "text-sky-400", ringClassName: "ring-sky-400/40", swatchClassName: "bg-sky-400", hex: "#38bdf8" },
  { value: "emerald", label: "Verde", className: "text-emerald-400", ringClassName: "ring-emerald-400/40", swatchClassName: "bg-emerald-400", hex: "#34d399" },
  { value: "amber", label: "Ambar", className: "text-amber-400", ringClassName: "ring-amber-400/40", swatchClassName: "bg-amber-400", hex: "#fbbf24" },
  { value: "violet", label: "Violeta", className: "text-violet-400", ringClassName: "ring-violet-400/40", swatchClassName: "bg-violet-400", hex: "#a78bfa" },
  { value: "pink", label: "Rosa", className: "text-pink-400", ringClassName: "ring-pink-400/40", swatchClassName: "bg-pink-400", hex: "#f472b6" },
  { value: "slate", label: "Pizarra", className: "text-slate-300", ringClassName: "ring-slate-300/40", swatchClassName: "bg-slate-300", hex: "#cbd5e1" },
] as const;

export type ActivityIdentityPresetValue = (typeof ACTIVITY_IDENTITY_PRESETS)[number]["value"];

interface ActivityIdentityPreset {
  value: ActivityIdentityPresetValue;
  label: string;
  icon: LucideIcon;
  iconNode: readonly IconNode[];
}

interface ActivityIdentityColor {
  value: string;
  label: string;
  className?: string;
  ringClassName?: string;
  swatchClassName?: string;
  hex: string;
  style?: CSSProperties;
  isCustom?: boolean;
}

interface ActivityIdentitySelection {
  preset: ActivityIdentityPresetValue;
  color: string;
}

function isHexColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function getActivityIdentityPreset(value: string): ActivityIdentityPreset {
  return ACTIVITY_IDENTITY_PRESETS.find((preset) => preset.value === value) ?? ACTIVITY_IDENTITY_PRESETS[0];
}

export function getActivityIdentityColor(value: string): ActivityIdentityColor {
  const preset = ACTIVITY_IDENTITY_COLORS.find((color) => color.value === value);
  if (preset) {
    return { ...preset, style: undefined, isCustom: false };
  }

  if (isHexColor(value)) {
    return {
      value,
      label: "Personalizado",
      className: undefined,
      ringClassName: undefined,
      swatchClassName: undefined,
      hex: value,
      style: { color: value },
      isCustom: true,
    };
  }

  return { ...ACTIVITY_IDENTITY_COLORS[0], style: undefined, isCustom: false };
}

export function buildActivityPresetLogoUrl(
  presetValue: ActivityIdentityPresetValue,
  colorValue: string
) {
  const preset = getActivityIdentityPreset(presetValue);
  const color = getActivityIdentityColor(colorValue);
  const stroke = isHexColor(color.hex) ? color.hex : ACTIVITY_IDENTITY_COLORS[0].hex;

  const markup = preset.iconNode
    .map(([tag, attributes]) => {
      const attrs = Object.entries(attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");

      return `<${tag} ${attrs} />`;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-2 -2 28 28" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${markup}
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function inferActivityIdentityFromLogoUrl(
  logoUrl?: string | null
): ActivityIdentitySelection | null {
  if (!logoUrl?.startsWith("data:image/svg+xml;utf8,")) {
    return null;
  }

  try {
    const svg = decodeURIComponent(logoUrl.replace("data:image/svg+xml;utf8,", ""));
    const strokeMatch = svg.match(/stroke="([^"]+)"/i);
    const color = strokeMatch?.[1];

    const preset = ACTIVITY_IDENTITY_PRESETS.find((candidate) => {
      const markup = candidate.iconNode
        .map(([tag, attributes]) => {
          const attrs = Object.entries(attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(" ");

          return `<${tag} ${attrs} />`;
        })
        .join("");

      return svg.includes(markup);
    });

    if (!preset || !color) {
      return null;
    }

    return {
      preset: preset.value,
      color,
    };
  } catch {
    return null;
  }
}
