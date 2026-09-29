# Seagulla — UI/UX Specification

Industrial-grade reference for implementation. Every value here is a decision, not a suggestion.
Where a number appears, use that number.

**Design north star.** A gull scans miles of shoreline and takes the one thing worth having.
The app should feel like *coastal light*: warm neutrals, generous white space, soft shadows, a
cool sea accent. Bright and calm, never the battleship-grey of legacy post tools. That contrast
is the premium signal.

**The one rule that governs everything below.** This is a tool someone uses eight hours a day.
Motion must *inform*, never *decorate*. Every animation answers one question: *what just changed,
and where did it come from?* Anything that cannot answer that is deleted.

---

## 1. Design tokens

### 1.1 Color — light

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F7F6F3` | Window background, warm off-white |
| `surface` | `#FFFFFF` | Cards, popovers, fields |
| `surfaceSunken` | `#EFEEEA` | Wells, empty slots, track backgrounds |
| `borderSubtle` | `rgba(0,0,0,0.06)` | Card hairlines, dividers |
| `borderStrong` | `rgba(0,0,0,0.12)` | Field borders, focused dividers |
| `textPrimary` | `#1C1B19` | Titles, values |
| `textSecondary` | `#6B6862` | Labels, supporting copy |
| `textTertiary` | `#9A968E` | Counts, timecode, section headers |
| `accent` | `#2B7FD4` | Selection, focus, primary actions |
| `accentSoft` | `rgba(43,127,212,0.12)` | Selected row fill |
| `indexing` | `#7B61FF` | Indexing activity only |
| `success` | `#3A9B6B` | Volume online, export complete |
| `warning` | `#D9902B` | Thermal throttle, degraded index |
| `danger` | `#D6483B` | Decode failure, destructive actions |

### 1.2 Color — dark

| Token | Value |
|---|---|
| `canvas` | `#1A1A1C` |
| `surface` | `#242427` |
| `surfaceSunken` | `#151517` |
| `borderSubtle` | `rgba(255,255,255,0.08)` |
| `borderStrong` | `rgba(255,255,255,0.16)` |
| `textPrimary` | `#F2F1EE` |
| `textSecondary` | `#A8A5A0` |
| `textTertiary` | `#726F6A` |
| `accent` | `#4D9BE8` |
| `accentSoft` | `rgba(77,155,232,0.18)` |

Define every token once as a CSS custom property on `:root`, redefined under
`[data-theme="dark"]`. Tailwind reads them through `@theme`. Never branch on theme in component
code — the cascade resolves it, including for Increase Contrast.

### 1.3 Type — SF Pro

| Token | Size/Leading | Weight | Use |
|---|---|---|---|
| `display` | 28/34 | Semibold | Onboarding, empty states |
| `title1` | 22/28 | Semibold | Sheet titles |
| `title2` | 17/22 | Semibold | Content header ("Visual 41") |
| `headline` | 15/20 | Semibold | Inspector section titles |
| `body` | 13/18 | Regular | Sidebar rows, transcript, most UI |
| `callout` | 12/16 | Regular | Secondary metadata |
| `caption` | 11/14 | Regular | Counts, section headers |
| `micro` | 10/13 | Medium | Card badges |
| `mono` | 11/14 | Regular | **SF Mono** — timecode, durations, throughput |

All timecode uses `mono` with `.monospacedDigit()`. Numbers that change must never reflow.

### 1.4 Spacing, radius, elevation

**Spacing scale:** `2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Nothing off-scale.

**Radius:** `xs 4` · `sm 6` (sidebar rows) · `md 8` (fields, buttons) · `lg 10` (**moment cards**) ·
`xl 14` (popovers, sheets) · `pill 999`.

**Elevation:**

| Token | Shadow |
|---|---|
| `e1` | `0 1px 2px rgba(0,0,0,.06)`, `0 0 0 .5px rgba(0,0,0,.04)` |
| `e2` | `0 2px 6px rgba(0,0,0,.08)`, `0 0 0 .5px rgba(0,0,0,.05)` — card at rest |
| `e3` | `0 8px 20px rgba(0,0,0,.12)` — card hovered |
| `e4` | `0 16px 40px rgba(0,0,0,.18)` — HUD, popovers, sheets |

### 1.5 Motion

| Token | Spec | Use |
|---|---|---|
| `micro` | 120ms `easeOut` | Hover, highlight, badge reveal |
| `short` | 180ms `easeInOut` | Toggles, disclosure, chip insert |
| `snappy` | `spring(response: .28, damping: .86)` | Selection, card lift, HUD expand |
| `gentle` | `spring(response: .45, damping: .90)` | Panel slide, shared-element transition |
| `long` | 400ms | Onboarding only. Never in the main loop. |

**Reduce Motion:** every token collapses to a 100ms cross-fade. No springs, no travel, no
shimmer. Read `accessibilityReduceMotion` once in a `MotionProvider` environment object; views
never check it individually.

---

## 2. Window and chrome

- `.windowStyle(.hiddenTitleBar)`, full-size content view, system corner radius
- Default **1280×800**; minimum **1000×640**
- **Sidebar:** `NSVisualEffectMaterial::Sidebar` via the `window-vibrancy` crate — this is
  what produces the reference's translucency over the desktop. See
  [`macos-native-in-tauri.md`](macos-native-in-tauri.md) §2.
- **Content area:** opaque `canvas`. Do *not* make it translucent; thumbnails need a stable
  background for accurate color judgement. The reference does the same.
- **Toolbar:** 52pt, no system toolbar — a custom `HStack` so the centred title, chevrons and
  trailing controls land exactly as in the reference
- Traffic lights: leave system-positioned; inset sidebar content 12pt top to clear them

**Layout**

| Region | Default | Range | Behaviour |
|---|---|---|---|
| Sidebar | 240 | 200–320 | Auto-collapses below 900pt window width |
| Content | flex | ≥520 | Gutter 20 |
| Inspector | 320 | 280–420 | Overlays content below 1100pt |

---

## 3. Sidebar

- **Top pill group** — `+` (add volume/folder) and sidebar toggle. 32pt tall, inset 12/10,
  `surface` fill, `e1`, radius `pill`. Directly from the reference.
- **Primary rows** — All Moments · Inbox · Starred · Tags · Trash
  - 28pt tall, radius `sm`, icon 16pt leading, `body` label, `caption`/`textTertiary` count trailing
  - Hover: `rgba(0,0,0,.04)` · Selected: `accentSoft` fill, `accent` icon, `textPrimary` label
  - Selection background **slides** between rows via a shared-element FLIP transition (`snappy`)
- **Volumes section** — ours, not the reference's. This is the differentiator, on screen always.
  - 8pt status dot: `success` online, `textTertiary` offline
  - While indexing, the count is **replaced** by a 14pt determinate progress ring in `indexing`
  - Offline rows render label and icon at 60% opacity
- **Spaces section** — saved searches, lifted from the reference. Emoji or SF Symbol in an
  18pt accent-tinted rounded square. User-creatable, drag to reorder.
- **Section headers** — `caption`, `textTertiary`, uppercase, tracking 0.5, padding 16 top / 4 bottom
- **Bottom bar** — 44pt, hairline separator above:
  throughput pill (left) · **What's new** with unread dot (centre) · recent-searches history (right)

---

## 4. The moment card

The single most important component. A card is a **moment**, not a file.

**Base:** native aspect preserved, radius `lg`, `e2`, `surface` backing.

**Overlays** (all fade in on hover at `micro` unless noted):
- Bottom-left: duration pill — `mono` 10pt, `rgba(0,0,0,.55)` + blur, radius `xs`
- Bottom-right: source timecode — `mono` 10pt
- Top-left: codec badge (R3D / BRAW / ProRes) — **always visible** when non-standard
- Top-right: dialogue-match glyph when the hit came from speech

**States**

| State | Spec |
|---|---|
| Rest | `e2` |
| Hover | `e3`, translate y −2, `snappy` |
| **Scrubbing** | Cursor x across card width maps to `[t_in, t_out]`; poster swaps to nearest filmstrip tile; 2pt progress line + playhead tick at bottom |
| Selected | 2pt inset `accent` ring |
| Keyboard focus | Selected ring **plus** outer `0 0 0 4px accentSoft` glow |
| Multi-select | Filled check circle, top-left, spring in |
| Loading | Skeleton shimmer, 1.2s sweep — **static block under Reduce Motion** |
| Offline | Image desaturated to 25%, unplugged glyph, tooltip *"Plug in Archive 07"* |
| Error | Neutral placeholder, `warning` glyph, retry on click |

**Hover-scrub is the signature interaction of the product.** It must be instant. Prefetch the
filmstrip atlas for visible cards; never decode on hover.

### Grid

- Masonry, target column 240pt (min 180, max 320), user-adjustable via `⌘+` / `⌘-`
- Gutter 12, balanced column heights
- **Virtualized — mandatory.** Behind a narrow component interface so a canvas/WebGL renderer
  can replace the DOM one when profiling demands it. In a webview this is the *only* escape
  hatch, so the seam must exist from the first commit.
- Modes: **Masonry** (default) · **Grid** (uniform) · **List** (row + inline filmstrip)

---

## 5. Search

- Field 280pt, expands to 420 on focus (`snappy`). Placeholder: *"Describe a moment…"*
- **Query chips.** Structured filters parse out of natural language and render as removable
  chips: typing `interviews in the kitchen last march on alexa` yields chips
  `[Mar 2026]` `[Camera: Alexa]` with `interviews in the kitchen` left as the semantic term.
  Chips insert at `short` with a slight scale-in.
- Recent searches drop down on focus; `⌘⇧F` clears.

### Progressive results — the hardest UX problem here

Stage-1 recall returns in ~80–400ms. Stage-2 rerank arrives 200–900ms later and **changes the
ranking**. Cards that rearrange under a moving cursor are infuriating.

**Required behaviour:**
1. Stage-1 results render immediately. A 2pt indeterminate bar under the search field indicates
   refinement in progress.
2. Stage-2 **never reorders in place while the pointer is moving.** Reordering waits for 400ms
   of pointer idle.
3. When reordering does run, it uses a staggered FLIP transition (30ms stagger, max 8 items) so
   cards visibly *travel* to their new positions. Nothing teleports.
4. Cards whose rank improved pulse their ring once in `accent` at 20%.
5. Setting, default on: **"Promote best matches to a separate row"** — stage-2 winners appear in
   a pinned *Best matches* strip at the top instead of reordering the main grid at all. This is
   the non-disruptive default; power users can turn it off for pure ranking.

---

## 6. Inspector

Stacked, collapsible sections — not tabs. Editors scan, they do not navigate.

- **Preview** — player + filmstrip scrubber with in/out handles that **snap magnetically to shot
  boundaries** (12px capture radius, a 1-frame visual tick on snap)
- **Transcript** — virtualized; current line highlighted with a 3pt leading `accent` bar;
  auto-scroll that pauses the moment the user scrolls manually and offers a *Resume* affordance
- **Matches** — *"Matched because…"* with the transcript line, visual concept, or OCR text, each
  with a confidence bar. **This section is a feature, not debug output.** Plausible false
  positives are inevitable; showing evidence turns an error into a legible error, which users
  forgive.
- **Metadata** — camera, codec, resolution, fps, source timecode, volume, file path (click to reveal)

---

## 7. Throughput HUD

The reference's floating bottom-right pill, repurposed.

- 36pt tall, radius `pill`, `.hudWindow` material, `e4`
- Collapsed: activity ring + `mono` text — *"4.2× · 3 volumes"*
- Expanded (click): popover with per-volume progress, ETA, thermal state, pause/resume per volume
- Digits roll with a monospaced transition — **never reflow**
- Auto-hides after 10s idle when nothing is indexing; returns on activity at `gentle`

---

## 8. Micro-interactions

**Do we need them? Yes — about fifteen of them, and not one more.**

The test each must pass: *does this communicate a state change that would otherwise be
invisible or confusing?* Decoration on a repeated action becomes an irritant by the fiftieth
repetition, and an editor will hit these paths hundreds of times a day.

### Earned

| # | Interaction | Timing | What it communicates |
|---|---|---|---|
| 1 | **Hover-scrub** on card | instant | The moment's content without opening it |
| 2 | Card hover lift + shadow bloom | `snappy` | This is the target |
| 3 | Sidebar selection slide | `snappy` | Where focus moved from and to |
| 4 | Search field focus expand | `snappy` | Input mode engaged |
| 5 | Query chip insert | `short` | Your words became a structured filter |
| 6 | Result stagger-in | 30ms × 8 | Results arrived as a set, not a flash |
| 7 | Stage-2 FLIP reorder | `gentle` | Ranking improved — here's where things went |
| 8 | Rank-improved ring pulse | `micro` ×1 | This result got better |
| 9 | Grid → detail shared element | `gentle` | The detail *is* the card you clicked |
| 10 | Star / select toggle pop | `snappy` | Committed |
| 11 | In/out handle snap tick | 80ms | You landed exactly on a shot boundary |
| 12 | Volume progress ring | continuous | Work is happening, roughly this much left |
| 13 | Throughput digit roll | `micro` | Live number, not a stale one |
| 14 | Drag-out: card lifts, ghost follows, target glows | `snappy` | This will land there |
| 15 | Toast slide-up from bottom-right | `short` | Something finished; you may ignore it |

### Banned

Bouncy springs on routine clicks · spinners where a skeleton belongs · any transition over 250ms
in the main loop · parallax on scroll · animated app icon · sound effects · confetti or celebration
states · hover animations that shift layout · progress bars that animate backwards · anything that
delays a keyboard-driven action.

**Keyboard actions never animate longer than 100ms.** A user holding `→` through fifty cards must
not watch fifty transitions.

---

## 9. Fancy visuals — hitting the reference bar

Seven effects, in implementation order. Each is cheap and each is visible.

1. **Vibrancy layering.** Sidebar `.sidebar` behind-window; HUD `.hudWindow`. Single largest
   contributor to the reference's feel.
2. **Ambient tint.** Extract the dominant color of the hovered or selected card and bleed it into
   the canvas at **8% opacity over 400ms**. Apple Music's now-playing trick. Reads as expensive,
   costs almost nothing, and genuinely aids orientation. Disable under Reduce Transparency.
3. **Film grain overlay.** A tiled noise texture at **2.5% opacity** over the canvas. Ties to the
   silver-halide heritage of the medium *and* eliminates gradient banding. Sub-pixel cost.
4. **Progressive image loading.** Blur-hash-style 4×4 placeholder → full thumbnail cross-fade at
   `micro`. Never show an empty rectangle.
5. **Mesh-gradient empty states** (CSS conic/radial layers). Soft coastal gradient behind onboarding, empty
   library and no-results. Modern, and unmistakably 2026.
6. **Scroll-condensing header.** Content title shrinks `title2` → `headline` and a blur layer
   fades in behind the toolbar as the grid scrolls past 40pt.
7. **Accent focus glow.** Keyboard focus gets `0 0 0 4px accentSoft` outside the 2pt ring —
   visible across the room, unmistakable in a screenshot.

---

## 10. Settings

Standard macOS Settings window, `⌘,`, toolbar tabs. **Ten tabs, no nesting deeper than one level.**

| Tab | Contents |
|---|---|
| **General** | Appearance (Light/Dark/Auto), accent color, default view mode, launch behaviour |
| **Library** | Volumes: add, remove, relocate, rescan. Index storage location. Duplicate handling. |
| **Indexing** | Quality preset (Fast / Balanced / Thorough). Governor: pause on battery, pause above thermal threshold, pause while another app is in the foreground. Schedule window ("index 22:00–07:00"). Concurrency cap. |
| **Search** | Result count, ranking weights (visual / speech / OCR sliders), strictness, *Promote best matches* toggle, show match evidence |
| **Playback** | Prefer proxies, transport behaviour, timecode vs duration display, loop on scrub |
| **Export** | Default NLE format, destination presets, filename template, include SRT |
| **Shortcuts** | Full editable keymap — see §11 |
| **Privacy** | Diagnostics opt-in (off by default), face detection opt-in, plain-language statement of what leaves the machine: *nothing* |
| **Updates** | Sparkle channel (Stable / Beta), check frequency, **View changelog** |
| **Advanced** | Rebuild index, clear thumbnail cache, export logs, mock-engine toggles (debug builds only) |

**Settings principles.** Every control takes effect immediately — no Apply button. Every
non-obvious control carries a one-line explanation beneath it, not a tooltip. Destructive
actions (rebuild index, remove volume) require confirmation stating exactly what will be lost
and how long rebuilding takes.

---

## 11. Keyboard

Editors live on the keyboard. This table is a product feature, not a convenience.

### Global
| Key | Action |
|---|---|
| `⌘F` | Focus search |
| `⌘⇧F` | Clear search and filters |
| `⌘B` | Toggle sidebar |
| `⌘I` | Toggle inspector |
| `⌘1…⌘9` | Jump to sidebar item *n* |
| `⌘+` / `⌘-` | Grid density |
| `⌘R` | Rescan volumes |
| `⌘,` | Settings |
| `⌘/` or `?` | **Shortcut cheat sheet overlay** |

### Navigation and transport
| Key | Action |
|---|---|
| `← → ↑ ↓` | Move selection |
| `⇧ + arrows` | Extend selection |
| `Space` | Play / pause preview |
| `J` `K` `L` | Shuttle back / pause / forward — **the editor standard, non-negotiable** |
| `← →` (in player) | Step one frame |
| `⇧← ⇧→` | Step one second |
| `Home` / `End` | First / last moment |

### Marking and actions
| Key | Action |
|---|---|
| `I` / `O` | Set in / out |
| `X` | Clear in/out |
| `S` | Star |
| `B` | Add to bin |
| `Return` | Open in NLE |
| `⌘E` | Export selects |
| `⌘⌥E` | Export as… |
| `⌘⌫` | Move to trash |
| `⌥` (hold) | Reveal source paths on all visible cards |

**Discoverability.** Three mechanisms, all required: every action appears in the menu bar with
its shortcut; `⌘/` opens a searchable cheat-sheet overlay; hovering any toolbar control shows its
shortcut in the tooltip after 600ms.

**Presets.** Settings → Shortcuts ships **Premiere**, **Final Cut** and **Resolve** presets that
remap to each NLE's muscle memory, plus a custom map with live conflict detection. An editor who
does not have to relearn keys adopts the tool in an afternoon. This is cheap to build and
disproportionately valuable.

---

## 12. Accessibility

Not optional, and several items below also improve the product for everyone.

- **VoiceOver:** every card carries a composed label — *"Moment, 4 seconds, timecode 01:12:04:18,
  Archive 07, matched dialogue: 'we moved here in spring'"*. Grid exposes row/column position.
- **Contrast:** 4.5:1 body, 3:1 for ≥17pt. Verify both appearances and Increase Contrast.
- **Reduce Motion:** all tokens → 100ms cross-fade. Shimmer becomes a static block.
- **Reduce Transparency:** sidebar and HUD become opaque; ambient tint disabled.
- **Full keyboard operability:** every action reachable without a pointer, visible focus at all times.
- **Focus must never be trapped** in the grid, transcript or inspector.
- Never encode meaning in color alone — volume status pairs its dot with an icon shape.

---

## 13. Performance budgets

UI quality *is* smoothness. These are hard limits, enforced with Instruments.

| Budget | Limit |
|---|---|
| Frame time | 8.3ms on ProMotion; **16.6ms absolute floor** |
| Scroll | Never below 60fps on a 100k-moment fixture library |
| Thumbnail decode | Off main thread, cancelled on scroll-past |
| In-flight decodes | ≤2 per visible card, ≤24 total |
| Thumbnail cache | 512MB cap, LRU eviction |
| Filmstrip | Sprite atlas per moment, single texture upload |
| Search field → first result | ≤400ms perceived, skeleton within 80ms |
| App launch → interactive | ≤1.2s cold |

Instrument the ingest pipeline and the scroll path with `OSSignposter` from Phase 1. Throughput
you cannot see is throughput you cannot defend.

---

## 14. Implementation notes

- **`src/lib/design` is the token layer**, built in Phase 1 with its own component gallery route
  showing every component in every state, both appearances, both motion settings. Components land
  in the gallery before they land in the product.
- **No magic numbers in component code.** Every value resolves from a Tailwind token that maps to
  a CSS custom property.
- **The grid renderer is swappable.** `MomentGrid` exposes a narrow interface — items, viewport,
  selection, scroll position — so a canvas/WebGL implementation can replace the virtualized DOM
  one without touching callers. See [`implementation-plan.md`](implementation-plan.md) §5.
- **Thumbnails are served over a custom Tauri protocol**, never base64 data URLs. Data URLs
  duplicate every image into the JS heap and will exhaust memory long before 100k moments.
- **Filmstrips are sprite atlases** — one image per moment, positioned with `background-position`,
  not sixteen requests per hover.
- **Types cross the IPC boundary once.** Rust structs derive `serde` and `ts-rs`; TypeScript
  definitions are generated at build time. Hand-written duplicates drift, and drift surfaces as a
  runtime error inside a webview.
- **Snapshot-test every component state** in both appearances. §4 and §5 alone specify roughly 60
  states; manual verification will not hold.
- **Native feel is a separate concern** from visual design. [`macos-native-in-tauri.md`](macos-native-in-tauri.md)
  owns window chrome, vibrancy, typography metrics, menus, and the specific tells that give a web
  UI away.
- Card, grid and inspector are built against the mock engines — realistic latency, progressive
  results, 2% failure rate — from the first commit. See [`implementation-plan.md`](implementation-plan.md) §8.
