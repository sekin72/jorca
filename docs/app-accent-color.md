# App Accent Color

Status: **Design — proposed 2026-07-14** · Owner: kaan · Scope: single accent color for app chrome

Design note for adding a user-selectable **accent color** to Orca's app chrome.
The existing light/dark/system switcher stays; this layers one customizable
hue on top that recolors Orca's "state" colors (primary action, focus ring,
hover wash, charts) while all surfaces remain neutral gray.

Inspired by [Null Space](https://apps.apple.com/us/app/null-space/) (`/Applications/Null Space.app`),
whose theming model is macOS native appearance (`NSAppearance`) plus a custom
color picker (`ColorBloomPicker` / `ColorHexChip`) for a user-chosen accent —
not a full custom-palette or theme-import system. This doc matches that model.

> **Scope decision (2026-07-14).** An earlier draft proposed full custom
> palettes + JSON import (mirroring Orca's terminal theme pipeline). After
> inspecting Null Space and re-reading `docs/STYLEGUIDE.md` ("monochrome and
> quiet — neutral grays carry the chrome, color is reserved for state"), the
> scope was narrowed to **accent only**. Full palettes/import remain a
> future hook (see end) but are not built here.

---

## Motivation

Orca's chrome today has two hardcoded palettes (`:root` light, `.dark` dark in
`src/renderer/src/assets/main.css`) and a `system | dark | light` switcher. The
primary action color, focus ring, and hover wash are all neutral. Users have
no way to personalize the accent — a small but common expectation for a tool
they spend hours in.

Null Space shows the minimal viable version of this: keep native appearance,
let the user pick one color, apply it as the accent. Orca already has the
machinery for this exact pattern in `src/renderer/src/lib/left-sidebar-appearance.ts`
(a tint color mixed into a surface via `color-mix`), so the feature is a
straightforward extension.

## Locked decisions

1. **Accent only, not full palettes.** One user-chosen hue. Surfaces, neutral
   foregrounds, borders, and semantic colors stay on the existing neutral
   palette. This preserves the monochrome identity in `STYLEGUIDE.md`.
2. **One setting, both modes.** `appAccentColor?: string` (hex). The same
   accent applies in light and dark; `color-mix` derivations against the
   resolved `--background` adapt automatically. No separate dark/light accent.
3. **Default = no override.** When `appAccentColor` is unset/empty, no inline
   CSS variables are written and the app looks exactly as it does today
   (`--primary` stays neutral gray/near-white).
4. **Git colors stay fixed.** Git decoration tokens
   (`--git-decoration-*`), `--git-graph-*`, `--destructive`, `--status-success`,
   `--terminal-pane-title-*`, `--tab-group-split-divider`, and
   `--annotation-highlight` are **not** affected by the accent. `STYLEGUIDE.md`
   pins git decorations to the VS Code palette by design; the others are
   semantic or surface-specific.
5. **Lives in the Interface section** of Settings → Appearance, directly under
   the existing light/dark/system segmented control. No new accordion section.
6. **Reuse `ColorField`.** The existing `ColorField` in
   `SettingsFormControls.tsx` (native color input + hex text field) is the
   control. Add a row of preset swatches above it for one-click picks,
   matching Null Space's `ColorBloomPicker` feel.

## Model

### New setting

```ts
// src/shared/types.ts (GlobalSettings)
appAccentColor?: string  // hex string e.g. "#3b82f6"; empty/undefined = no override
```

Default in `src/shared/constants.ts`: omitted (undefined → no override).
Normalized on load in `src/main/persistence.ts` and
`src/renderer/src/web/web-preload-api.ts` using `HEX_COLOR_RE`
(`src/shared/color-validation.ts`) — invalid/empty values normalize to
`undefined`.

### Token derivation

When `appAccentColor` is a valid hex, a new `applyAppAccentColor(color)`
function sets inline CSS custom properties on `document.documentElement`,
overriding the `:root`/`.dark` CSS defaults. Reuses the
`theme-transition-disabled` two-frame trick from
`src/renderer/src/lib/document-theme.ts` to avoid staggered fades.

| Token | Override value | Why |
| --- | --- | --- |
| `--primary` | `<accent>` | The affirmative-action color (Save, Confirm). |
| `--primary-foreground` | `#fafafa` or `#0a0a0a` (luminance-gated) | Text on primary buttons stays readable. |
| `--ring` | `<accent>` | Focus-visible outlines + selection halos. |
| `--accent` | `color-mix(in srgb, <accent> 12%, var(--background))` | Hover/active wash for ghost buttons + list rows. Auto-adapts to light/dark. |
| `--accent-foreground` | `var(--foreground)` | Hover text stays neutral. |
| `--sidebar-primary` | `<accent>` | Sidebar primary action matches app primary. |
| `--sidebar-ring` | `<accent>` | Sidebar focus rings match. |
| `--chart-1` … `--chart-5` | `color-mix` tints/shades of `<accent>` | Charts follow the accent. |

`--primary-foreground` luminance gate: compute relative luminance of the
accent (sRGB → linear → `0.2126R + 0.7152G + 0.0722B`); if `> 0.55` use
`#0a0a0a` (dark text on a light accent), else `#fafafa`. This keeps
contrast on primary buttons above WCAG AA for any accent a user is likely
to pick.

### Tokens that do NOT change

Surfaces and neutral foregrounds stay on the existing palette so the chrome
remains monochrome: `--background`, `--foreground`, `--card`, `--card-foreground`,
`--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground`,
`--muted`, `--muted-foreground`, `--border`, `--input`, `--sidebar`,
`--sidebar-foreground`, `--sidebar-accent`, `--sidebar-border`,
`--worktree-sidebar-*`, `--editor-surface`.

Semantic/specialized tokens stay fixed (see Locked decision 4).

### Application lifecycle

- `src/renderer/src/App.tsx` already has a theme `useEffect` (around line 1509)
  that calls `applyDocumentTheme(settings.theme)`. Add a sibling `useEffect`
  that calls `applyAppAccentColor(settings.appAccentColor)` whenever
  `appAccentColor` *or* `theme` changes (the accent's `color-mix` resolves
  against `--background`, which flips with the mode).
- Clearing the accent (`undefined`/empty) removes the inline properties → the
  CSS defaults re-apply → app reverts to today's neutral look.

## UI

In `src/renderer/src/components/settings/AppearanceInterfaceSection.tsx`,
directly under the existing Theme segmented control, add an "Accent Color"
`SearchableSetting` row:

1. A row of **preset swatches** (small rounded color chips): Orca (neutral,
   = clear), Blue `#3b82f6`, Violet `#8b5cf6`, Green `#22c55e`, Orange
   `#f97316`, Pink `#ec4899`, Cyan `#06b6d4`. Clicking a swatch sets
   `appAccentColor` (Orca swatch clears it).
2. A **`ColorField`** below the swatches for custom hex entry, identical to
   the one in `LeftSidebarAppearanceSetting.tsx`.

Add a matching search entry to `appearance-search.ts` (`getAccentEntries`)
with keywords `accent`, `color`, `theme`, `primary`, `ring`, `tint` so the
searchable settings box finds it.

A `ChromePreview`-style live swatch is optional for v1; the `ColorField`'s
native color input already shows the current color. Deferred.

## Files

| | File | Change |
| --- | --- | --- |
| NEW | `src/renderer/src/lib/app-accent-color.ts` | `applyAppAccentColor`, `resolveAccentStyleVariables`, luminance + contrast helpers, preset swatch list |
| EDIT | `src/shared/types.ts` | add `appAccentColor?: string` to `GlobalSettings` |
| EDIT | `src/shared/constants.ts` | default (omitted) |
| EDIT | `src/main/persistence.ts` | normalize on load |
| EDIT | `src/renderer/src/web/web-preload-api.ts` | normalize on web load |
| EDIT | `src/renderer/src/App.tsx` | `useEffect` applying accent on `appAccentColor`/`theme` change |
| EDIT | `src/renderer/src/components/settings/AppearanceInterfaceSection.tsx` | Accent row: swatches + `ColorField` |
| EDIT | `src/renderer/src/components/settings/appearance-search.ts` | `getAccentEntries` |
| EDIT | `docs/STYLEGUIDE.md` | note that the accent is the only chrome color a user may set; surfaces remain monochrome |
| NEW | tests: `app-accent-color.test.ts` (derivation + luminance + normalize), `AppearanceInterfaceSection` accent-row test |

## Contrast safety

- `--primary` / `--primary-foreground`: gated by the luminance check above.
  A user can still pick a mid-gray accent that fails AA; v1 accepts that
  (it's their choice) but the preset swatches are all chosen to pass.
- `--ring` on `--background`: accent on neutral — passes AA for the preset
  set; custom values are the user's responsibility.
- `--accent` (hover wash) is a 12% mix against background — subtle by design,
  always readable because `--accent-foreground` stays `--foreground`.

No hard validation block in v1. If contrast complaints arise, add an inline
warning (like terminal import's `unsupportedFeatures`) later.

## Build order

1. `app-accent-color.ts` with derivation + tests (pure function, no UI).
2. Settings field + defaults + normalize (types, constants, persistence,
   web-preload-api).
3. `App.tsx` `useEffect` wiring.
4. `AppearanceInterfaceSection` UI (swatches + `ColorField`) + search entry.
5. `STYLEGUIDE.md` note.
6. Manual check: pick each preset, toggle light/dark, confirm primary buttons,
   focus rings, hover rows, and charts shift; confirm git decorations and
   surfaces do not; confirm clearing the accent reverts to today's look.

## Future hooks (out of scope here)

- **Built-in full palettes** (Nord, Dracula, …) — curatorial burden; only if
  accent-only proves insufficient.
- **Custom palette JSON import** — mirror `terminal-custom-themes.ts`; only
  if users ask.
- **VS Code `.json` theme import** — partial mapping; deferred.
- **Per-mode accent** (different accent in dark vs light) — add
  `appAccentColorDark` / `appAccentColorLight` if requested.
- **`ChromePreview` live preview** in the settings row.
