# Making a Tauri app feel native on macOS

Research notes and the decisions taken for Seagulla. Companion to
[`ui-ux-spec.md`](ui-ux-spec.md), which owns the visual design.

**The honest framing.** A Tauri app is a native process wrapping a system webview. The window,
menus, traffic lights and materials are genuinely native and cost little. Everything *inside* the
window is a web page, and that is where apps give themselves away. The gap is closed by a long
tail of small, specific details — not by a component library.

---

## 1. Window chrome

Three layers, and you need all three.

### 1.1 Titlebar

`tauri.conf.json`:

```json
{
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "title": "Seagulla",
        "width": 1280,
        "height": 800,
        "minWidth": 1000,
        "minHeight": 640,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "transparent": true
      }
    ]
  }
}
```

- `titleBarStyle: "Overlay"` keeps the native titlebar — and therefore native window dragging,
  double-click-to-zoom, window snapping and the traffic lights — while letting content run
  beneath it. `"Transparent"` is the other option; **avoid fully custom decorations**, which
  forfeit those behaviours and are the single most common reason a Tauri app feels wrong.
- `hiddenTitle: true` removes the centred title string so you can draw your own.
- `transparent: true` and `macOSPrivateApi: true` are both prerequisites for vibrancy.

### 1.2 Traffic-light inset

The default traffic-light position rarely lines up with a custom 52pt toolbar. Two options:

- [`tauri-plugin-decorum`](https://github.com/clearlysid/tauri-plugin-decorum) —
  `window.set_traffic_lights_inset(12.0, 18.0)`. Note it is in maintenance mode; the author's
  stated hope is that Tauri absorbs the functionality.
- Direct `objc2-app-kit` — set `NSWindow` button frames yourself. More code, no dependency,
  and you will already have `objc2` in the tree for other reasons.

Seagulla uses the direct approach in `seagulla-platform`, because the inset must be recomputed
when the sidebar collapses.

**Reserve the space in CSS**, or your sidebar content collides with the buttons:

```css
.sidebar-top { padding-top: 28px; }  /* clears the traffic lights */
```

### 1.3 Drag regions

Any element can become draggable:

```html
<div data-tauri-drag-region class="toolbar">…</div>
```

Interactive children inside a drag region must opt out, or clicks get swallowed:

```css
.toolbar button, .toolbar input { -webkit-app-region: no-drag; }
```

---

## 2. Vibrancy and materials

This is the highest-impact single change. The [`window-vibrancy`](https://github.com/tauri-apps/window-vibrancy)
crate wraps `NSVisualEffectView`:

```rust
#[cfg(target_os = "macos")]
{
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
    apply_vibrancy(
        &window,
        NSVisualEffectMaterial::Sidebar,
        Some(NSVisualEffectState::FollowsWindowActiveState),
        None,
    )?;
}
```

Materials worth knowing: `Sidebar`, `HeaderView`, `HudWindow`, `UnderWindowBackground`,
`ContentBackground`, `Popover`, `Menu`, `Titlebar`, `Sheet`, `FullScreenUI`.

Seagulla's mapping, per `ui-ux-spec.md` §2:

| Surface | Material |
|---|---|
| Sidebar | `Sidebar` |
| Throughput HUD pill | `HudWindow` |
| Content area | **none — opaque** |

The content area stays opaque deliberately. Thumbnails need a stable background for accurate
colour judgement, and translucency behind a dense image grid reads as noise rather than depth.

**The webview must be see-through for any of this to show.** With Tailwind:

```css
html, body { background: transparent; }
.content-pane { background: var(--canvas); }  /* opaque again, on purpose */
```

**Respect the system setting.** Reduce Transparency must fall back to opaque. Read it via
`NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency` and push it to the frontend as
a data attribute on `<html>`.

---

## 3. Typography

macOS UI is smaller and tighter than the web default. This is the cheapest large win.

```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  font-size: 13px;               /* macOS body size, not 16px */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.tabular { font-variant-numeric: tabular-nums; }
.mono    { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
```

- `-apple-system` resolves to SF Pro in WKWebView at no download cost, and picks the correct
  optical size (SF Pro Text vs Display) automatically.
- **13px, not 16px.** Web defaults look oversized and instantly wrong beside real macOS apps.
- `-webkit-font-smoothing: antialiased` matches AppKit rendering weight. Without it, text in a
  webview looks heavier than the surrounding system UI.
- Timecode and any live-updating number needs `tabular-nums`, or digits jitter.

---

## 4. The details that give a web app away

Ranked by how quickly a Mac user notices.

| Tell | Fix |
|---|---|
| Text selection everywhere | `user-select: none` globally; re-enable on transcripts and fields |
| Browser focus rings | Custom ring per `ui-ux-spec.md` §1; never leave the default outline |
| Wrong cursor over UI | `cursor: default`, not `pointer`, on buttons — macOS does not use a hand cursor |
| Drag-and-drop ghost images | `e.dataTransfer.setDragImage()` or a custom drag layer |
| Web-styled scrollbars | Leave WebKit overlay scrollbars alone. Do **not** style them. |
| Chunky 16px text | 13px base, per §3 |
| Right-click showing a web menu | Suppress `contextmenu`; use Tauri's native menu API |
| `⌘F` opening webview find | Intercept and route to your own search field |
| Animations that overshoot | Short durations, subtle springs; see `ui-ux-spec.md` §1.5 |
| No menu bar | Build a real one — see §5 |

```css
*  { user-select: none; cursor: default; }
input, textarea, [data-selectable] { user-select: text; cursor: text; }
```

---

## 5. Menus and shortcuts

A macOS app without a real menu bar is immediately identifiable. Tauri 2 exposes native
`Menu`/`Submenu`/`MenuItem` from Rust. Build the standard set — App, File, Edit, View, Window,
Help — with correct roles, so system behaviours (Services, Hide, Minimize, Zoom, Full Screen)
work without implementation.

Two rules:

- **Every action lives in the menu bar with its shortcut shown.** That is where Mac users look,
  and it is how `ui-ux-spec.md` §11's discoverability requirement is satisfied.
- **Register shortcuts natively, not with a JS keydown listener.** Native accelerators fire
  reliably, show in menus and survive focus changes. Reserve JS handling for keys that are only
  meaningful inside a focused component (`J`/`K`/`L` transport).

Intercept the webview defaults that leak through: `⌘F`, `⌘R`, `⌘P`, `⌘+`/`⌘-`, and the
right-click context menu.

---

## 6. Known pitfalls

- **The keystroke beep.** WKWebView beeps when a key is pressed and no focused element accepts
  it — long-standing, unfixed. Ensure a focusable sink always has focus, or swallow the events
  that trigger it. This will hit the `J`/`K`/`L` transport directly.
- **Text selection performance.** Selecting or copying large amounts of text in WKWebView is
  noticeably slow. Relevant to the transcript panel — virtualize it, and keep DOM nodes small.
- **First-paint flash.** A transparent window shows desktop before the webview paints. Set the
  native window background colour to your canvas token so the flash matches the app.
- **Vibrancy needs private API.** `macOSPrivateApi: true` is fine for direct distribution but is
  a Mac App Store rejection risk. Seagulla ships direct, so this is acceptable — but it forecloses
  MAS without rework.

---

## 7. What must be built, not imported

There is no macOS component library for the web worth adopting. Everything below is bespoke,
built against the tokens in `ui-ux-spec.md` §1:

Sidebar rows and section headers · segmented controls · the moment card with hover-scrub ·
masonry grid · search field with query chips · inspector disclosure sections · filmstrip scrubber
with magnetic snap · throughput HUD · toasts · popovers · settings panes.

This is not a shortcut lost. Seagulla's distinctive surfaces — the hover-scrub card, the
filmstrip scrubber, the volumes sidebar — have no equivalent in any library regardless of
platform, and they are most of the UI.

---

## 8. The Linux development loop

You develop on Linux against **WebKitGTK**; you ship on macOS against **WKWebView**. Both are
WebKit, which makes this far safer than a Chromium-based stack would be — but they are not
identical, and none of §1, §2 or §5 renders on Linux at all.

**What this means day to day:**

| Works on Linux | macOS only |
|---|---|
| All layout, components, interaction, state | Vibrancy and materials |
| The grid, virtualization, performance work | Traffic lights and titlebar overlay |
| The entire Rust core, headless, with `cargo test` | Native menu bar behaviours |
| Mock engines and fixtures | Font rendering and SF Pro metrics |

**Therefore:**

1. Keep the native shell **thin**. Vibrancy, traffic lights and menus should be a few hundred
   lines in `seagulla-platform`, changed rarely. Everything else is platform-neutral web.
2. Gate the platform code so a Linux build runs with a plain opaque window. `#[cfg(target_os)]`
   in Rust; a `data-platform` attribute on `<html>` for CSS.
3. **Ship a Linux build.** It costs little given the cross-platform core, and it is the only way
   you use your own product daily.
4. Put **screenshot capture in macOS CI**. A build artifact showing the real window is worth more
   than a VNC session you have to remember to open.
5. Batch macOS verification. Chrome work lands in dedicated passes, not continuously.

---

## Sources

- [Tauri — Window Customization](https://v2.tauri.app/learn/window-customization/)
- [Tauri — SvelteKit](https://v2.tauri.app/start/frontend/sveltekit/)
- [window-vibrancy](https://github.com/tauri-apps/window-vibrancy)
- [tauri-plugin-decorum](https://github.com/clearlysid/tauri-plugin-decorum)
- [Tauri issue #4789 — inset traffic lights](https://github.com/tauri-apps/tauri/issues/4789)
- [Tauri issue #11822 — macOS performance](https://github.com/tauri-apps/tauri/issues/11822)
- [8 tips for a native look and feel in Tauri](https://dev.to/akr/8-tips-for-creating-a-native-look-and-feel-in-tauri-applications-3loe)
- [System fonts on the web — Jim Nielsen](https://blog.jim-nielsen.com/2020/system-fonts-on-the-web/)
- [What's the deal with WebKit font smoothing — David Bushell](https://dbushell.com/2024/11/05/webkit-font-smoothing/)
- [macos-design-skill](https://github.com/ceorkm/macos-design-skill)
- [abstand — Tauri + Rust + Swift macOS app](https://github.com/builder-group/abstand)
- [virtua — virtual list/grid for Svelte](https://github.com/inokawa/virtua)
- [objc2 — Apple framework bindings for Rust](https://github.com/madsmtm/objc2)
