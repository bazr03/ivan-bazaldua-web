# Dark Mode Specification

> Specification for the manual-toggle dark theme on the Iván Bazaldúa site.
> This document describes the **contract** the theming system must satisfy,
> not a line-by-line implementation guide. Any change to theme behavior must
> keep this spec true.

## 1. Intent

Provide a dark theme that the user can toggle manually, with the choice
persisted across sessions and the initial state defaulting to the operating
system preference. The theme applies site-wide with no flash of the
incorrect theme on load (no FOUC).

## 2. Scope

**In scope**
- A dark color palette layered on the existing CSS custom-property token system.
- A theme toggle control in the site header.
- Persistence of the user's choice in `localStorage`.
- FOUC-free initial paint driven by a synchronous head script.
- Re-mapping of all hardcoded light surfaces to semantic tokens so they flip.

**Out of scope (non-goals)**
- Live re-syncing of an already-open tab when the OS theme changes (see §11).
- Flipping the `<meta name="theme-color">` browser-chrome color per theme.
- Theme per-route or per-component overrides.
- A theme auto-switch based on time of day.
- Server-side theme negotiation / cookies. This is a static site; theme is
  resolved client-side only.
- Any change to contact-form logic, SEO/JSON-LD, or the logo asset.

## 3. Token contract

Theme switching is driven **only** by overriding CSS custom properties. No
component hardcodes a theme; components consume semantic tokens.

### 3.1 New semantic surface tokens (defined on `:root`, overridden in dark)

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `--color-bg` | `#ffffff` (page white) | `#141419` | Page background |
| `--color-surface` | `#ffffff` | `#1e1e24` (brand charcoal) | Cards, nav, inputs, toggle |
| `--color-border` | `#e5e5e5` (grey-light) | `#2e2e36` | Hairlines on surfaces |
| `--color-bg-soft` | `#f7f6f2` (cream) | `#25262e` | Soft/elevated sections (hero, steps, CTA) |

### 3.2 Accent surface tokens (high-emphasis CTA / badges)

| Token | Light value | Dark value | Used for |
|---|---|---|---|
| `--color-accent` | `#1e1e24` (charcoal) | `#00a8cc` (brand electric) | Primary buttons, badges |
| `--color-on-accent` | `#ffffff` | `#1e1e24` (charcoal) | Text/icon on accent |
| `--color-accent-hover` | `#000000` | `#0089a8` (electric-dark) | Hover state of accent |

In dark mode the accent flips from charcoal to brand cyan, with charcoal text
on cyan. This is a deliberate inversion: the brand cyan carries the
high-emphasis role in dark, giving CTA buttons strong pop against the
charcoal surface.

### 3.3 Text roles

| Token | Light | Dark |
|---|---|---|
| `--text-primary` | charcoal `#1e1e24` | white `#ffffff` |
| `--text-secondary` | grey `#9ca3af` | `#9ca3af` (unchanged) |
| `--text-on-dark` | white | white (`section--dark` stays a dark surface) |

### 3.4 Shadows & native chrome

- `--shadow-sm` / `--shadow-md` become blacker in dark so they still read.
- `color-scheme: light` is set on `:root`; `color-scheme: dark` is set in the
  `[data-theme="dark"]` block. This makes native form controls, scrollbars,
  and form autofill backgrounds match the active theme.

### 3.5 Selector & application point

- The dark token block is scoped to `[data-theme="dark"]`.
- The attribute is set on `<html>` (`document.documentElement.dataset.theme`).
- The brand accent token `--color-electric: #00a8cc` is **not** redefined in
  dark; it is reused as `--color-accent` so a single brand cyan is the source
  of truth.

### 3.6 `section--dark` in dark mode

The `.section--dark` utility (charcoal background + light text) exists to
create contrast strips on the light theme. In dark mode that contrast
collapses, so `[data-theme="dark"] .section--dark` re-maps its background to
`var(--color-bg-soft)` — a subtle elevation step rather than a clash.

## 4. Theme selection & persistence (FOUC contract)

Initial theme resolution MUST happen before first paint, synchronously, in
`<head>`. Requirements:

1. **R1 — Read stored preference.** Read `localStorage.getItem("theme")`.
2. **R2 — Fall back to OS preference.** If no stored value, use
   `window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"`.
3. **R3 — Apply before paint.** Set
   `document.documentElement.dataset.theme = <resolved>` synchronously (a
   plain `<script is:inline>`, NOT `type="module"`, NOT deferred).
4. **R4 — No throw on no-JS.** If JS is disabled, the site renders in the
   light theme (the `:root` default). The toggle is non-functional but the
   site is fully usable.

The script lives in `src/layouts/Layout.astro` `<head>`, before `<title>`.

## 5. Toggle control contract (`ThemeToggle.astro`)

A single button element (rendered in the nav list; the same element serves
desktop and mobile via CSS).

**Markup requirements**
- `<button type="button">` with `data-theme-toggle` attribute (hook for JS).
- `aria-label` reflects the *target* state:
  - light active → `"Switch to dark mode"`
  - dark active → `"Switch to light mode"`
- `aria-pressed` is `"true"` when dark is active, `"false"` otherwise.
- Two inline SVG icons (sun, moon), both `aria-hidden="true"` (the label
  conveys state; icons are decorative). No icon library.

**Icon visibility rule**
- Light / no-JS: show the **moon** (semantic: "click to go dark").
- Dark: show the **sun** (semantic: "click to go light").
- Driven by CSS using `:global([data-theme="dark"])` — no JS needed to swap
  the visible icon.

**Behavior requirements**
- **R5 — Flip on click.** Click sets
  `document.documentElement.dataset.theme` to the opposite of the current
  value.
- **R6 — Persist.** Click writes `localStorage.setItem("theme", next)`.
- **R7 — Sync all instances.** After any change, every
  `[data-theme-toggle]` updates its `aria-pressed` and `aria-label`. (There
  is one instance today; the contract supports multiple for future layouts.)
- **R8 — Initialize on load.** On script load, `sync()` runs once so the
  button's aria state matches the theme the FOUC script already applied.

**Styling**
- 40×40 pill, `border: 1px solid var(--color-border)`,
  `background: var(--color-surface)`, `color: var(--text-primary)`.
- Hover: border + color → `var(--color-electric)`.
- Active: `transform: scale(0.94)` (tactile feedback).
- `@media (prefers-reduced-motion: reduce)` disables transitions.

## 6. Placement

`ThemeToggle` is rendered inside `Nav.astro`'s nav list, adjacent to the
CONTACTO CTA. It must not break the mobile hamburger layout, the `is-open`
max-height transition, or the active-link underline. The nav background must
use `--color-surface` (with the existing `backdrop-filter: blur(8px)`
preserved) — **no hardcoded `rgba(255,255,255,…)`**.

## 7. Component obligations (dark-mode safety)

Every component and page MUST satisfy:

- **R9 — No hardcoded light surfaces.** No `rgba(255,255,255,…)`,
  `#fff`/`#ffffff`, or `var(--color-white)` used as a `background` or
  `background-color`. Surfaces use `--color-surface` / `--color-bg` /
  `--color-bg-soft`.
- **R10 — No hardcoded light borders.** Borders use `--color-border`.
- **R11 — Text uses semantic tokens.** Body/heading text uses
  `--text-primary`; secondary text uses `--text-secondary`. No `color: #fff`
  or `color: #1e1e24` literals for text.
- **R12 — Accent surfaces use accent tokens.** Primary buttons, badges, and
  other high-emphasis fills use `--color-accent` with `--color-on-accent`
  text, hover `--color-accent-hover`.

**Intentional exceptions (do not "fix")**
- `Footer.astro`: an always-dark surface by design; its `rgba(255,255,255,…)`
  top border is correct in both themes.
- `WhatsAppFloat.astro`: brand-green floating button; color is fixed by
  brand, not theme-driven.

## 8. Accessibility

- **Contrast.** Body text on dark `#141419`/`#1e1e24` is white — meets WCAG
  AAA. Accent (cyan `#00a8cc`) with charcoal text `#1e1e24` ≈ 8.4:1, meets
  AAA. Secondary text `#9ca3af` on dark surfaces meets AA for non-essential
  text.
- **Toggle is operable** by keyboard and screen reader (`type="button"`,
  `aria-pressed`, descriptive `aria-label`).
- **Reduced motion** respected by the toggle and by `global.css`'s
  `prefers-reduced-motion` block.
- **`color-scheme`** set so native controls match.

## 9. Palette summary

Dark palette (lifted charcoal — never pure `#000`):

```
--color-bg:        #141419   /* page */
--color-surface:   #1e1e24   /* cards, nav, inputs (= brand charcoal) */
--color-bg-soft:   #25262e   /* elevated sections */
--color-border:    #2e2e36   /* hairlines */
--color-accent:    #00a8cc   /* brand electric (CTA pop) */
--color-on-accent: #1e1e24   /* charcoal on cyan */
```

## 10. Verification

- `npm run build` compiles cleanly (5 pages, no errors/warnings).
- The FOUC `<script is:inline>` is present in `dist/index.html` `<head>`
  before `<title>`, setting `document.documentElement.dataset.theme`.
- The `data-theme-toggle` button is rendered in the nav of the built output.

## 11. Known ceilings (deliberate shortcuts)

Marked in source with `// ponytail:` comments:

1. **No live `prefers-color-scheme` listener.** If the OS theme changes
   while a tab is open, the tab does not auto-flip; re-opening the tab
   re-syncs. The manual toggle works in all cases.
   *Upgrade path:* add a `matchMedia('(prefers-color-scheme: dark)')`
   `change` listener that updates the attribute only when no explicit
   `localStorage` choice exists.
2. **`color-mix()` used for the translucent nav background** requires
   Chrome 111+ / Safari 16.2+ / Firefox 113+ (April 2023). A solid
   `--color-surface` fallback precedes it; pre-2023 browsers get an opaque
   nav (blur invisible, no breakage).
3. **`<meta name="theme-color">` stays `#00a8cc`** in both themes (browser
   chrome color). Not theme-aware by design (YAGNI).

## 12. Future work (not in this spec)

- Live OS-theme sync (see §11.1).
- Per-theme `theme-color` meta.
- Re-evaluating the hero `__strata` decorative gradient, whose
  charcoal-tinted stripes go near-invisible on dark — decorative only today.
