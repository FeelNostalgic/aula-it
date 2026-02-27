# Aula IT Learning Dashboard

## Product Overview

**The Pitch:** A high-performance command center for IT students tracking their professional growth in SMR, ASIR, DAW, and DAM tracks. This isn't just a learning management system; it’s a career-readiness interface that treats education like a production deployment.

**For:** IT students and junior developers who value efficiency, clarity, and tools that mirror their future professional environments (IDEs, CI/CD dashboards).

**Device:** Desktop (Primary focus), Tablet (Secondary)

**Design Direction:** "Dark Mode Default" Industrial SaaS. High-contrast monochromatic foundations with semantic syntax-highlighting accent colors. Brutalist borders, monospaced data points, and terminal-inspired aesthetics.

**Inspired by:** Vercel (grid precision), GitHub (contribution graphs), Linear (keyboard-first interactions), Warp Terminal (modern CLI aesthetic).

---


<summary>Design System</summary>

## Color Palette

Strict monochrome base with IDE-syntax accent colors.

- **Background:** `#0A0A0A` - Deep void black (OLED optimized)
- **Surface:** `#171717` - Card backgrounds, subtle lift
- **Border:** `#333333` - Structural grid lines
- **Primary Text:** `#EDEDED` - High readability
- **Muted Text:** `#888888` - Metadata, labels
- **Accent Blue:** `#0070F3` - Primary Actions, Focus states (Vercel Blue)
- **Accent Green:** `#23C55E` - Success, Passing Grades, "Online" status
- **Accent Amber:** `#F59E0B` - Warnings, In-progress
- **Accent Red:** `#EF4444` - Errors, Failed Tests

## Typography

- **Headings:** **Geist Sans** (or Inter Tight), 600-700 weight. Tracking -0.02em.
- **Body:** **Geist Sans** (or Inter), 400 weight, 16px.
- **Code/Data:** **JetBrains Mono**, 400-500 weight. Used for badges, stats, and timestamps.

**Style Notes:**
- **Borders:** 1px solid `#333333` on all containers. No soft shadows; crisp edges.
- **Radius:** `6px` on buttons and inputs (tight), `8px` on cards.
- **Glassmorphism:** Minimal usage, only on sticky headers (`backdrop-filter: blur(8px)`).

## Design Tokens

```css
:root {
  --bg-page: #0A0A0A;
  --bg-card: #171717;
  --border-subtle: #333333;
  --text-primary: #EDEDED;
  --text-muted: #888888;
  --font-sans: 'Geist Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

---