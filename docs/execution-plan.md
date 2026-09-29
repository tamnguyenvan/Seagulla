# Seagulla — Execution Plan (Work Breakdown)

Companion to [`implementation-plan.md`](implementation-plan.md) (architecture),
[`ui-ux-spec.md`](ui-ux-spec.md) (UI contract) and
[`macos-native-in-tauri.md`](macos-native-in-tauri.md) (native feel).

**Estimates assume one full-time developer.** `d` = working day. Total ≈ **150d ≈ 30 weeks**.
**ID scheme:** `P<phase>.<epic>.<task>`. **Done when** is an acceptance criterion, not "code written".

> **Development is on Linux; the product ships for macOS.** Tasks marked **🍎** cannot be
> verified locally and must be checked on macOS CI or via VNC. Everything else runs natively on
> Linux — including, unlike the previous plan, the entire Rust engine.

---

## Timeline and gates

| Phase | Name                             | Est | Gate                                     |
| ----- | -------------------------------- | --- | ---------------------------------------- |
| 1     | Foundation, mocks, design tokens | 15d | Gallery renders every component state    |
| 2     | App shell on mocks               | 32d | **60fps on 100k-moment fixtures**        |
| 3     | Workflow + chrome                | 20d | Demoable; run customer interviews        |
| 4     | Real ingest                      | 25d | **≥5× realtime on mixed codecs**         |
| 5     | Real retrieval                   | 23d | **Two-stage lift obvious to a stranger** |
| 6     | Archive scale                    | 20d | 40TB / 12-volume library usable          |
| 7     | Ship                             | 15d | Notarized build, 10 beta facilities      |

---

## Phase 1 — Foundation (15d)

### P1.1 Workspace scaffold (3d)

| ID     | Task                                                                 | Est   | Done when                                             |
| ------ | -------------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| P1.1.1 | Cargo workspace with the nine crates from implementation-plan §2.1   | 0.5d  | `cargo build` succeeds; layering matches the manifest |
| P1.1.2 | SvelteKit + `adapter-static` + `ssr = false`, TypeScript strict      | 0.5d  | `pnpm build` emits a static bundle                    |
| P1.1.3 | Tailwind v4 wired to CSS custom properties via `@theme`              | 0.5d  | A token change propagates to a component              |
| P1.1.4 | Tauri 2 shell; `pnpm tauri dev` opens a window on Linux              | 0.5d  | Window opens, frontend loads                          |
| P1.1.5 | `ts-rs` type generation from Rust → TypeScript                       | 0.5d  | A Rust struct change breaks the TS build              |
| P1.1.6 | Lint/format: `rustfmt`, `clippy -D warnings`, `eslint`, `prettier`   | 0.25d | `just lint` passes                                    |
| P1.1.7 | Layering checker over `Cargo.toml` dependency graph, with self-tests | 0.25d | Detects a forbidden crate dependency                  |
| P1.1.8 | CI: Linux job (build, test, lint) + macOS job (bundle, screenshot)   | 0.5d  | Both green on a PR                                    |

### P1.2 Domain model (3d)

| ID     | Task                                                                                                        | Est  | Done when                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| P1.2.1 | Entities: `Volume`, `Asset`, `Moment`, `TranscriptSegment`, `Tag`, `Collection`, `SavedSearch`, `SelectBin` | 0.5d | All `Serialize`/`Deserialize`/`TS`                                                   |
| P1.2.2 | **`Timecode`, `TimeRange`, `FrameRate`**                                                                    | 1.5d | Round-trips 23.976/24/25/29.97DF/30/50/59.94/60 without drift; `proptest` cases pass |
| P1.2.3 | Engine traits: `IngestEngine`, `SearchEngine` (streaming, staged results)                                   | 0.5d | Mock and real conform without trait changes                                          |
| P1.2.4 | Error taxonomy with user-facing messages                                                                    | 0.5d | Every error has a non-technical message                                              |

> **P1.2.2 is the highest-risk small task in the phase.** Drop-frame timecode is where media apps
> quietly break, and in/out points, exporters and seeking all inherit the bug. Property tests
> before implementation.

### P1.3 Persistence (2.5d)

`P1.3.1` rusqlite + WAL + migration framework (1d) · `P1.3.2` v1 schema (0.5d) ·
`P1.3.3` FTS5 tables for transcripts and OCR (0.5d) · `P1.3.4` USearch integration spike:
open, mmap, add, search (0.5d)

### P1.4 Mock engines and fixtures (3.5d)

| ID     | Task                                                                   | Est   | Done when                                        |
| ------ | ---------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| P1.4.1 | Fixture generator: 100k moments, 12 volumes, realistic distributions   | 1d    | Deterministic from a seed, <30s                  |
| P1.4.2 | Procedural thumbnails and filmstrip atlases                            | 0.75d | 100k visually distinct tiles                     |
| P1.4.3 | `MockSearchEngine`: stage-1 at 80–400ms, stage-2 at 200–900ms          | 0.75d | Two batches per query; second reorders the first |
| P1.4.4 | `MockIngestEngine`: 3× realtime, progress events, volume mount/unmount | 0.5d  | Volume can drop mid-index                        |
| P1.4.5 | Fault injection, 2% default, configurable                              | 0.25d | Decode, model-load and volume failures           |
| P1.4.6 | Debug knobs panel                                                      | 0.25d | Dev builds only                                  |

> _The mock must lie about content, never about physics._ If P1.4.3 returns instantly and never
> fails, Phase 2 builds a UI that dies on real data.

### P1.5 Design system (2d)

`P1.5.1` colour/type/spacing/radius/elevation tokens as CSS custom properties, both themes (0.5d) ·
`P1.5.2` motion tokens + Reduce Motion collapse (0.25d) · `P1.5.3` primitives: Button, Field,
Chip, Badge, ProgressRing, StatusDot, Skeleton, Toast (0.75d) · `P1.5.4` `/gallery` route
covering every state × theme × motion setting (0.5d)

### P1.6 Hedges (1d, parallel) — **all runnable on Linux**

| ID     | Task                                                                 | Est  | Done when                                                |
| ------ | -------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| P1.6.1 | FFmpeg decode benchmark: H.264 + ProRes at reduced resolution, timed | 0.5d | A realtime-factor number exists                          |
| P1.6.2 | ONNX export + `ort` load of the stage-1 encoder                      | 0.5d | Loads and embeds one frame, or fails with a known reason |
| P1.6.3 | **Start RED + Blackmagic RAW SDK registration**                      | 0.1d | Submitted — both ship Linux builds                       |

> Do P1.6.3 on **day one**; it blocks P4.9 and nothing can unblock it faster. Unlike the SwiftUI
> plan, P1.6.1 and P1.6.2 now run on your own machine — the two biggest technical unknowns are
> answerable in week one.

---

## Phase 2 — App shell on mocks (32d)

### P2.1 Window and native chrome (5d)

| ID     | Task                                                                                    | Est  | Done when                                                  |
| ------ | --------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| P2.1.1 | 🍎 Transparent overlay titlebar, `hiddenTitle`, drag regions                            | 1d   | Native drag, double-click zoom and snapping all still work |
| P2.1.2 | 🍎 Vibrancy: `Sidebar` material, opaque content pane                                    | 1d   | Matches the reference screenshot                           |
| P2.1.3 | 🍎 Traffic-light inset, recomputed on sidebar collapse                                  | 1d   | Aligned with the 52pt toolbar at every width               |
| P2.1.4 | Linux fallback: opaque window, no vibrancy, same layout                                 | 0.5d | Dev build looks correct on Linux                           |
| P2.1.5 | Native-feel CSS pass: 13px base, font smoothing, no text selection, cursors, scrollbars | 1d   | Checklist in macos-native-in-tauri §4 complete             |
| P2.1.6 | 🍎 CI screenshot artifact of the real macOS window                                      | 0.5d | Every macOS build attaches a PNG                           |

### P2.2 Sidebar (4d)

`P2.2.1` rows + states (0.5d) · `P2.2.2` FLIP selection slide (0.5d) · `P2.2.3` primary section with
live counts (0.5d) · `P2.2.4` **Volumes** section: status dots, progress rings, offline treatment (1d) ·
`P2.2.5` **Spaces**: CRUD, icon picker, drag-reorder (1d) · `P2.2.6` bottom bar: HUD pill, What's new,
history (0.5d)

### P2.3 Moment card (5d)

`P2.3.1` base card, aspect, hover lift (0.5d) · `P2.3.2` overlay badges (0.5d) ·
`P2.3.3` **hover-scrub** from the filmstrip atlas (1.5d) · `P2.3.4` remaining 9 states (1d) ·
`P2.3.5` progressive image loading via custom protocol (0.5d) · `P2.3.6` snapshot tests, all states ×
both themes (1d)

### P2.4 Grid — the phase risk (9d)

| ID     | Task                                                            | Est  | Done when                                |
| ------ | --------------------------------------------------------------- | ---- | ---------------------------------------- |
| P2.4.1 | `MomentGrid` interface + masonry layout engine                  | 1.5d | Balanced columns, stable across resize   |
| P2.4.2 | Virtualized DOM renderer (`virtua`) with recycling              | 2d   | Constant node count while scrolling 100k |
| P2.4.3 | Thumbnail delivery over a custom Tauri protocol + LRU cache     | 1.5d | No base64; heap stays flat               |
| P2.4.4 | Selection model: single, shift-range, cmd-multi                 | 1d   | —                                        |
| P2.4.5 | Keyboard navigation                                             | 0.5d | Held-arrow traversal animates ≤100ms     |
| P2.4.6 | Density control, Grid and List modes                            | 0.5d | Persists per Space                       |
| P2.4.7 | **Perf gate: 60fps floor on 100k fixtures**                     | 1d   | Profile attached to the PR               |
| P2.4.8 | _(conditional)_ Canvas/WebGL renderer behind the same interface | +5d  | Only if P2.4.7 fails                     |

> **This is the single largest risk in the project.** A webview has no `NSCollectionView` to fall
> back to; P2.4.8 _is_ the escape hatch, which is why P2.4.1 must define a narrow interface before
> any renderer exists.

### P2.5 Search (5d)

`P2.5.1` field + focus expand (0.25d) · `P2.5.2` query parser → chips, mock rules (1d) ·
`P2.5.3` chip component (0.5d) · `P2.5.4` recent searches (0.25d) ·
`P2.5.5` **progressive results**: stage-1 render + refinement bar (1d) ·
`P2.5.6` **pointer-idle gate (400ms) + staggered FLIP reorder** (1.5d) ·
`P2.5.7` _Best matches_ strip, default on, + rank-improved pulse (0.5d)

### P2.6 Inspector (4d)

`P2.6.1` disclosure sections (0.5d) · `P2.6.2` preview + player (0.5d) ·
`P2.6.3` filmstrip scrubber with **magnetic snap** to shot boundaries (1.5d) ·
`P2.6.4` virtualized transcript with synced highlight and pause-on-scroll (1d) ·
`P2.6.5` match evidence + confidence bars (0.25d) · `P2.6.6` metadata + reveal in file manager (0.25d)

### P2.7 Player and HUD (3d)

`P2.7.1` `<video>` with frame-accurate seek against a proxy (1d) ·
`P2.7.2` transport: Space, **J/K/L shuttle**, frame step — beware the WKWebView keystroke beep (1d) ·
`P2.7.3` throughput HUD: collapsed pill, expanded popover, digit roll, auto-hide (1d)

---

## Phase 3 — Workflow + chrome (20d)

`P3.1` selects and bins (2d) ·
**`P3.2` exporters (5d)** — harness + golden files (0.5d), **FCPXML** (1.5d), **Premiere XML** (1.5d),
**Resolve EDL** (1d), SRT + CSV (0.5d). _Each verified by importing into the actual NLE, not by
reading the XML — this is where media tools most often ship broken output._ ·
`P3.3` drag-out to NLE via file promises (1.5d) ·
`P3.4` settings, ten flat panes, no Apply button (4d) ·
**`P3.5` shortcuts (3d)** — native menu bar with full parity, accelerator registration, conflict
detection, `⌘/` cheat sheet, and **Premiere / Final Cut / Resolve keymap presets** ·
`P3.6` onboarding + empty states (2d) ·
`P3.7` Tauri updater, signing keys, changelog as single source of truth (1.5d) ·
`P3.8` licensing with offline activation (1d) ·
`P3.9` accessibility pass: labels, contrast, keyboard, reduced motion/transparency (2d)

**Exit:** a complete, demoable, shippable-looking app with no real AI. **Run the 10 customer interviews here.**

---

## Phase 4 — Real ingest (25d)

Swap `MockIngestEngine` for the real pipeline behind the unchanged trait.

| ID    | Epic                                                              | Est  | Done when                                                    |
| ----- | ----------------------------------------------------------------- | ---- | ------------------------------------------------------------ |
| P4.1  | Volume discovery, crawl, persistent handles                       | 2d   | Survives unplug/replug and restart                           |
| P4.2  | Probe: container, codec, duration, fps, timecode, camera metadata | 2d   | Correct on a 20-file mixed corpus                            |
| P4.3  | **Single-pass decode at target resolution** (FFmpeg, 6K→336px)    | 4d   | One pass yields thumbs + scene signal + embed frames         |
| P4.4  | Shot segmentation with whip-pan guard                             | 3d   | Precision/recall measured against 50 hand-marked clips       |
| P4.5  | Thumbnail and filmstrip atlas generation                          | 1.5d | —                                                            |
| P4.6  | Audio: extract, VAD, `whisper-rs` transcription                   | 4d   | Metal on macOS, CPU/CUDA on Linux, same output               |
| P4.7  | 🍎 Hardware decode paths: VideoToolbox, VAAPI/NVDEC               | 2d   | Runtime-selected; software fallback correct                  |
| P4.8  | Attributes: shot size, camera move, dominant colour               | 2d   | —                                                            |
| P4.9  | Camera originals: **RED SDK**, **BRAW SDK** FFI                   | 3d   | R3D and BRAW index without transcoding _(blocked by P1.6.3)_ |
| P4.10 | Governor: thermal, power, foreground-app awareness                | 1.5d | Yields when the user's NLE comes forward                     |

> ### 🚦 GATE P4 — **≥5× realtime on the mixed codec set**
>
> Measure on Linux first, confirm on macOS CI. If this fails, the terabyte-scale positioning
> fails with it — stop and reassess before Phase 5.

---

## Phase 5 — Real retrieval (23d)

| ID   | Epic                                                                    | Est | Done when                                         |
| ---- | ----------------------------------------------------------------------- | --- | ------------------------------------------------- |
| P5.1 | **Benchmark harness first**: 150–200 clips, 60+ graded queries, NDCG@10 | 3d  | Reproducible score for any build                  |
| P5.2 | Stage-1 encoder in ONNX Runtime; Core ML EP on macOS, CPU/CUDA on Linux | 4d  | Same embeddings within tolerance across platforms |
| P5.3 | USearch index: build, mmap, incremental add, offline volumes            | 3d  | 1M vectors searchable without loading into RAM    |
| P5.4 | Hybrid fusion: ANN + FTS5 + filters via RRF                             | 2d  | Beats either channel alone                        |
| P5.5 | Real query parser, replacing the P2.5.2 mock                            | 2d  | —                                                 |
| P5.6 | Stage-2 rerank                                                          | 4d  | Measurable NDCG lift over stage-1                 |
| P5.7 | Temporal grounding → tighten in/out points                              | 3d  | Boundaries within 0.5s of hand-marked truth       |
| P5.8 | Match-evidence extraction                                               | 2d  | Every result explains itself                      |

> ### 🚦 GATE P5 — **Two-stage lift obvious to a stranger watching**
>
> Not "statistically significant". Show someone stage-1 and stage-2 side by side; if they cannot
> immediately tell which is better, the rerank is not earning its complexity.

---

## Phase 6 — Archive scale (20d)

`P6.1` offline-volume UX and plug-in prompts (3d) · `P6.2` `content_id` dedupe across duplicated
project copies (4d) · `P6.3` incremental model migration on version bump (5d) ·
`P6.4` index scheduling (2d) · `P6.5` 40TB / 1M+ moment performance (4d) ·
`P6.6` index verify, repair, rebuild (2d)

---

## Phase 7 — Ship (15d)

`P7.1` 🍎 macOS signing and notarization on CI (3d) · `P7.2` updater release pipeline and channels (2d) ·
`P7.3` crash reporting, opt-in, local-first (2d) · `P7.4` Linux build and packaging — _so you can
dogfood_ (2d) · `P7.5` private beta with 10 facilities (4d) · `P7.6` support docs and site (2d)

---

## Working notes

**Parallelisable.** P1.6 runs alongside P1.1–1.5. P2.3 and P2.4 develop against each other's
stubs. P3.2 exporters are mutually independent. P4.6 (audio) is independent of P4.3–4.5 (video).

**Critical path.** P1.2.2 (timecode) → P1.3.2 (schema) → P1.4.1 (fixtures) → P2.4 (grid) →
**P2.4.7 perf gate** → P3 → P4.3 (decode) → **P4 gate** → P5.2 (encoder) → **P5 gate**.

**Two external blockers — start both on day one.** RED/BRAW SDK registration (P1.6.3) and an
Apple Developer account with notarization proven end to end on CI (P7.1). Neither can be
accelerated later, and the second cannot be tested on Linux at all.

**Re-estimate after Phase 1.** If Phase 1 lands materially over 15d, scale the remainder by the
same factor rather than assuming you will catch up.
