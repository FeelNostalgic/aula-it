"use client";

import type { CSSProperties } from "react";
import {
  BookOpen,
  Brain,
  Cloud,
  Code,
  Cpu,
  Database,
  Globe,
  Monitor,
  Network,
  Shield,
  Smartphone,
  Terminal,
} from "lucide-react";

export const MODULE_ICON_OPTIONS = [
  { value: "BookOpen", label: "Libro", icon: BookOpen },
  { value: "Brain", label: "Cerebro", icon: Brain },
  { value: "Code", label: "Codigo", icon: Code },
  { value: "Network", label: "Red", icon: Network },
  { value: "Database", label: "Base de datos", icon: Database },
  { value: "Terminal", label: "Consola", icon: Terminal },
  { value: "Globe", label: "Globo", icon: Globe },
  { value: "Cpu", label: "Procesador", icon: Cpu },
  { value: "Shield", label: "Escudo", icon: Shield },
  { value: "Smartphone", label: "Movil", icon: Smartphone },
  { value: "Monitor", label: "Monitor", icon: Monitor },
  { value: "Cloud", label: "Nube", icon: Cloud },
] as const;

export const MODULE_ICON_COLORS = [
  { value: "default", label: "Cian", className: "text-accent-blue", swatchClassName: "bg-sky-400", ringClassName: "ring-sky-400/40", hex: "#22d3ee" },
  { value: "emerald", label: "Verde", className: "text-emerald-400", swatchClassName: "bg-emerald-400", ringClassName: "ring-emerald-400/40", hex: "#34d399" },
  { value: "amber", label: "Ambar", className: "text-amber-400", swatchClassName: "bg-amber-400", ringClassName: "ring-amber-400/40", hex: "#fbbf24" },
  { value: "violet", label: "Violeta", className: "text-violet-400", swatchClassName: "bg-violet-400", ringClassName: "ring-violet-400/40", hex: "#a78bfa" },
  { value: "pink", label: "Rosa", className: "text-pink-400", swatchClassName: "bg-pink-400", ringClassName: "ring-pink-400/40", hex: "#f472b6" },
  { value: "slate", label: "Pizarra", className: "text-slate-300", swatchClassName: "bg-slate-300", ringClassName: "ring-slate-300/40", hex: "#cbd5e1" },
] as const;

function isHexColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function getModuleIconOption(value: string) {
  return MODULE_ICON_OPTIONS.find((option) => option.value === value) ?? MODULE_ICON_OPTIONS[0];
}

export function getModuleIconColorOption(value?: string | null) {
  if (!value || value === "default") {
    return { ...MODULE_ICON_COLORS[0], style: undefined as CSSProperties | undefined, isCustom: false };
  }

  const preset = MODULE_ICON_COLORS.find((color) => color.value === value);
  if (preset) {
    return { ...preset, style: undefined as CSSProperties | undefined, isCustom: false };
  }

  if (isHexColor(value)) {
    return {
      value,
      label: "Personalizado",
      className: undefined,
      swatchClassName: undefined,
      ringClassName: undefined,
      hex: value,
      style: { color: value },
      isCustom: true,
    };
  }

  return { ...MODULE_ICON_COLORS[0], style: undefined as CSSProperties | undefined, isCustom: false };
}

export function getModuleIconVisualProps(value?: string | null) {
  const color = getModuleIconColorOption(value);

  return {
    className: color.className,
    style: color.style,
  };
}
