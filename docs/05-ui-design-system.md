# 05 — UI and Design System

## Design Language

LifeWorks uses the **Pennington Hennessy brand** throughout. The design language is:

- **Restrained and professional.** No gradients, no rounded corners (border-radius is 0), no drop shadows on cards. Clean rectangular geometry.
- **Warm, not cold.** The background is cream, not white. Navy is used for authority, gold for warmth and emphasis.
- **Text-led.** The platform is primarily a reading and writing experience. Typography is the primary design element.
- **Serif headings, sans-serif body.** Playfair Display for all headings; Inter for body text.

---

## Colour Palette

All colours are defined as CSS custom properties in `client/src/index.css` using the OKLCH colour space (required by Tailwind CSS 4).

| Token | OKLCH | Hex equivalent | Usage |
|---|---|---|---|
| `--lw-navy` / `--foreground` | `oklch(0.19 0.05 240)` | `#0f1f35` | Primary text, headings, nav background |
| `--lw-gold` / `--primary` | `oklch(0.68 0.13 72)` | `#c9973a` | CTAs, active states, gold accents, eyebrow rules |
| `--lw-cream` / `--background` | `oklch(0.96 0.015 85)` | `#f5f0e8` | Page background |
| `--lw-navy-mid` | `oklch(0.25 0.05 240)` | `#1a2f4a` | Sidebar hover, secondary navy |
| `--lw-navy-light` | `oklch(0.32 0.05 240)` | `#243d5c` | Tertiary navy |
| `--lw-gold-light` | `oklch(0.88 0.07 80)` | `#e8d5a8` | Gold tint backgrounds |
| `--lw-cream-dark` | `oklch(0.92 0.02 85)` | `#ede8e0` | Muted cream (card backgrounds, borders) |
| `--muted-foreground` | `oklch(0.42 0.03 240)` | `#5a6a7a` | Secondary text, labels, captions |
| `--border` | `oklch(0.85 0.02 85)` | `#d8d0c4` | All borders |

### Dark Mode

Dark mode is available (`.dark` class) but is not the default for LifeWorks. The counsellor dashboard and some tool pages may use it. Dark mode uses a very dark navy background (`oklch(0.14 0.04 240)`) with cream text.

---

## Typography

```css
/* Headings */
font-family: 'Playfair Display', Georgia, serif;

/* Body */
font-family: 'Inter', system-ui, sans-serif;
```

Both fonts are loaded from Google Fonts CDN in `client/index.html`. The WOW report PDF uses **Libre Franklin** (body) and **IBM Plex Mono** (accent/data) — these are report-specific and not used in the web UI.

### Type Scale (Tailwind defaults, no custom scale)

| Class | Size | Usage |
|---|---|---|
| `text-xs` | 12px | Labels, captions, badges |
| `text-sm` | 14px | Secondary body, form labels |
| `text-base` | 16px | Primary body text |
| `text-lg` | 18px | Lead paragraphs, card titles |
| `text-xl` | 20px | Section headings (h3) |
| `text-2xl` | 24px | Page headings (h2) |
| `text-3xl` | 30px | Hero headings (h1) |
| `text-4xl` | 36px | Landing page hero |

---

## Spacing and Layout

- **Border radius:** `--radius: 0rem` — all corners are sharp rectangles. No `rounded-*` classes on structural elements.
- **Container:** Auto-centred, responsive padding (1rem mobile → 2rem desktop), max-width 1280px.
- **Grid:** Tailwind grid utilities. Most pages use a single-column layout on mobile, two-column on desktop.
- **Sidebar:** The counsellor dashboard uses `DashboardLayout` with a navy sidebar. Client-facing pages use `LifeworkLayout` (PHNav top bar + full-width content).

---

## Component Library

The project uses **shadcn/ui** — Radix UI primitives with Tailwind styling. All components are in `client/src/components/ui/`. They are pre-themed to the PH palette via CSS variables.

### Available UI Primitives

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `button-group`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `spinner`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`

### Custom Application Components

| Component | File | Purpose |
|---|---|---|
| `LifeworkLayout` | `components/LifeworkLayout.tsx` | Wrapper for all client-facing pages; adds PHNav |
| `PHNav` | `components/PHNav.tsx` | Top navigation bar (PH logo, nav links, auth state) |
| `PHFooter` | `components/PHFooter.tsx` | Footer for PH marketing pages |
| `DashboardLayout` | `components/DashboardLayout.tsx` | Navy sidebar layout for counsellor dashboard |
| `AIChatBox` | `components/AIChatBox.tsx` | Full-featured chat UI with streaming, markdown rendering |
| `InsightsWheel` | `components/InsightsWheel.tsx` | SVG visualisation of VIA/IPIP profile |
| `WowReportTab` | `components/WowReportTab.tsx` | WOW report viewer tab (PDF download, section preview) |
| `CoachingSessionTab` | `components/CoachingSessionTab.tsx` | Coaching annex generation UI |
| `LinkedInRewriterTab` | `components/LinkedInRewriterTab.tsx` | LinkedIn profile rewriter tool |
| `RoleDecoderTab` | `components/RoleDecoderTab.tsx` | Role/job description decoder tool |
| `SageCounsellorPanel` | `components/SageCounsellorPanel.tsx` | Counsellor-facing Sage AI panel |

---

## Shared CSS Utilities

Defined in `client/src/index.css` under `@layer components`:

```css
/* PH-style section eyebrow: gold rule + small caps label */
.lw-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lw-gold);
}
.lw-eyebrow::before {
  content: '';
  display: block;
  width: 2.5rem;
  height: 1px;
  background: var(--lw-gold);
}
```

This eyebrow pattern (gold rule + small-caps label) is the primary section-labelling device across the marketing site and the coaching app. Use it for any new section header.

---

## Layout Patterns

### Client-Facing Pages (LifeworkLayout)

```
┌─────────────────────────────────────────────────────┐
│  PHNav  (navy, full-width, sticky)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Page content (cream background)                    │
│  ┌─────────────────────────────────────────────┐   │
│  │  .container (max-w-1280, auto-centred)       │   │
│  │  Page header (navy bg, gold eyebrow, h1)     │   │
│  │  Content area                                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Counsellor Dashboard (DashboardLayout)

```
┌──────────┬──────────────────────────────────────────┐
│  Sidebar │  Main content area                       │
│  (navy)  │  (cream background)                      │
│          │  ┌────────────────────────────────────┐  │
│  Nav     │  │  Page header                       │  │
│  items   │  │  Tabs / content                    │  │
│          │  └────────────────────────────────────┘  │
│  User    │                                          │
│  profile │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## Button Variants

The `Button` component has these variants (from shadcn/ui, themed to PH palette):

| Variant | Background | Text | Usage |
|---|---|---|---|
| `default` | Gold (`--primary`) | Navy | Primary CTAs |
| `secondary` | Navy (`--secondary`) | Cream | Secondary actions |
| `outline` | Transparent | Navy | Tertiary actions, ghost buttons |
| `ghost` | Transparent | Navy | Icon buttons, nav items |
| `destructive` | Red | White | Delete / destructive actions |
| `link` | Transparent | Gold | Inline text links |

---

## Icons

Lucide React (`lucide-react` v0.453) is the icon library. All icons are used at `w-4 h-4` (small) or `w-5 h-5` (medium). No custom SVG icons are used in the web UI (the PH logo and Lifework logo are loaded as base64 strings from server helpers for PDF use).

---

## Animation

Framer Motion (`framer-motion` v12) is available and used sparingly — primarily for page transitions and the Insights Wheel animation. New features should use it for entrance animations only, not for continuous motion.

---

## Building a Screen That Looks Native

To build a screen visually indistinguishable from the rest of LifeWorks:

1. **Wrap in `LifeworkLayout`** (for client-facing) or `DashboardLayout` (for counsellor-facing).
2. **Use a navy page header** with a gold eyebrow (`.lw-eyebrow` class), a Playfair Display h1 in cream on navy, and a subtitle in `text-muted-foreground`.
3. **Use `Card` components** from `@/components/ui/card` for content sections. Cards have a near-white background (`--card`), no border-radius, and a subtle border.
4. **Use `Button` with `variant="default"`** (gold) for primary actions.
5. **Use `Tabs`** from `@/components/ui/tabs` for multi-section pages (the counsellor client profile uses this pattern extensively).
6. **Use `Skeleton`** from `@/components/ui/skeleton` for loading states.
7. **Use `toast`** from `sonner` for feedback messages.
8. **Do not use rounded corners** on structural elements. `rounded-*` is acceptable on badges and avatars only.
9. **Do not use drop shadows.** Use borders (`border border-border`) instead.
10. **Keep the cream background.** Do not use white (`bg-white`) — use `bg-background` or `bg-card`.
