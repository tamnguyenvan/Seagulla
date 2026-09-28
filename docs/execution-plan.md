# Seagulla — Execution Plan (Work Breakdown)

Companion to [`implementation-plan.md`](implementation-plan.md) (architecture) and
[`ui-ux-spec.md`](ui-ux-spec.md) (UI contract). This document is the build order.

**Estimates assume one full-time developer.** `d` = working day. Total ≈ **150d ≈ 30 weeks**.
Phases 4 and 5 carry the two deferred kill-criteria gates.

**ID scheme:** `P<phase>.<epic>.<task>`. Dependencies reference IDs.
**Done when** is the acceptance criterion — not "code written", but "verifiably works".

---

## Timeline and gates

| Phase | Name | Est | Cumulative | Gate |
|---|---|---|---|---|
| 1 | Foundation + design system | 15d | wk 3 | Gallery renders every component state |
| 2 | App shell (on mocks) | 30d | wk 9 | **60fps on 100k-moment fixture** |
| 3 | Workflow + chrome | 20d | wk 13 | Demoable, shippable-looking, no real AI |
| 4 | Real ingest | 25d | wk 18 | **≥5× realtime on mixed codecs** |
| 5 | Real retrieval | 25d | wk 23 | **Two-stage lift obvious to a stranger** |
| 6 | Archive scale | 20d | wk 27 | 40TB / 12-volume library usable |
| 7 | Ship | 15d | wk 30 | Notarized build with 10 beta facilities |
| 8 | Facility tier | — | post-1.0 | — |

**Customer interviews happen at the end of Phase 3**, against the mock build. Do not wait for
real AI to start selling.

---

## Phase 1 — Foundation + design system (15d)

### P1.1 Project scaffold (2d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P1.1.1 | Xcode project + SPM local packages | 0.5d | `Seagulla.xcodeproj` builds with 9 local packages linked |
| P1.1.2 | Module skeletons: `SeagullaKit`, `DesignSystem`, `PersistenceKit`, `MediaIO`, `MLRuntime`, `IngestEngine`, `SearchEngine`, `ExportKit`, `PlatformKit` | 0.5d | Each compiles, no cross-imports violating layering |
| P1.1.3 | Swift 6 strict concurrency, warnings-as-errors | 0.25d | Clean build with `-strict-concurrency=complete` |
| P1.1.4 | swift-format + SwiftLint config | 0.25d | `make lint` passes |
| P1.1.5 | Schemes: `App`, `Gallery`, `seagulla-cli`, `Tests` | 0.25d | All four run |
| P1.1.6 | GitHub Actions: build + test + lint on macOS runner | 0.25d | Green on a PR |

> **P1.1.2 layering rule:** `SeagullaKit` imports nothing. `DesignSystem` imports nothing.
> Engines import `SeagullaKit` only. `App` imports everything. Enforce in CI with a script.

### P1.2 Domain model + engine protocols (3d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P1.2.1 | Core entities: `Volume`, `Asset`, `Moment`, `TranscriptSegment`, `OCRSegment`, `Face`, `Person`, `Tag`, `Collection`, `SavedSearch`, `SelectBin` | 0.5d | All `Sendable`, all `Identifiable` |
| P1.2.2 | **Time types: `Timecode`, `TimeRange`, `FrameRate`** | 1d | Round-trips 23.976/24/25/29.97DF/30/50/59.94/60 without drift; property tests pass |
| P1.2.3 | `IngestEngine` protocol — start/pause/resume/cancel, `AsyncStream<IngestEvent>` | 0.5d | Mock and real both conform without protocol changes |
| P1.2.4 | `SearchEngine` protocol — query → `AsyncStream<ResultBatch>` with `stage` discriminator | 0.5d | Stage-1/stage-2 distinction expressible |
| P1.2.5 | `MediaSource`, `TranscriptionProvider`, `EmbeddingProvider`, `Exporter` protocols | 0.25d | — |
| P1.2.6 | Error taxonomy + user-facing message mapping | 0.25d | Every error has a non-technical message |

> **P1.2.2 is the highest-risk small task in Phase 1.** Drop-frame timecode is where media apps
> quietly break. Write the property tests before the implementation.

### P1.3 Persistence (3d)

| ID | Task | Est | Depends | Done when |
|---|---|---|---|---|
| P1.3.1 | GRDB setup, `DatabaseQueue`, WAL mode | 0.5d | P1.1.2 | Concurrent read during write verified |
| P1.3.2 | Migration framework + v1 schema | 1d | P1.2.1 | Migration runs forward on empty and populated DBs |
| P1.3.3 | FTS5 tables for transcript + OCR | 0.5d | P1.3.2 | Phrase and prefix queries return correct rows |
| P1.3.4 | Repository layer per aggregate | 0.5d | P1.3.2 | — |
| P1.3.5 | Query-plan verification at 100k moments | 0.25d | P1.4.1 | No full table scans on the hot paths |
| P1.3.6 | Thumbnail store: content-addressed + sprite atlas format | 0.25d | — | Atlas writes and reads a 16-tile filmstrip |

### P1.4 Mock engines + fixtures (4d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P1.4.1 | Fixture generator: 100k moments, 12 volumes, realistic duration/codec/aspect distributions | 1d | Generates deterministically from a seed in <30s |
| P1.4.2 | Procedural thumbnails + filmstrips (deterministic, visually varied) | 0.75d | 100k distinct-looking tiles, no disk bloat |
| P1.4.3 | Synthetic transcripts + OCR text from a sentence corpus | 0.5d | Searchable, plausible, repeatable |
| P1.4.4 | `MockSearchEngine`: stage-1 at 80–400ms jitter, stage-2 at 200–900ms | 0.75d | Emits two batches per query; second reorders the first |
| P1.4.5 | `MockIngestEngine`: 3× realtime, progress events, mount/unmount simulation | 0.5d | Volume can go offline mid-index |
| P1.4.6 | Fault injection — 2% default failure rate, configurable | 0.25d | Decode failures, model-load failures, volume drops |
| P1.4.7 | Debug knobs panel (latency, failure rate, throughput, library size) | 0.25d | Reachable in debug builds only |

> **This epic is what makes UI-first safe.** See `implementation-plan.md` §9 — *the mock must
> lie about content, never about physics*. If P1.4.4 returns instantly and never fails, Phase 2
> will build a UI that dies on real data.

### P1.5 DesignSystem (4d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P1.5.1 | Asset catalog: all color tokens × light/dark/increase-contrast | 0.5d | Zero `colorScheme` branches in view code |
| P1.5.2 | Type scale + `Font` extensions incl. `mono` monospaced-digit | 0.25d | Matches spec §1.3 exactly |
| P1.5.3 | Spacing / radius / elevation tokens | 0.25d | No magic numbers anywhere downstream |
| P1.5.4 | `MotionProvider` + motion tokens + Reduce Motion collapse | 0.5d | Toggling Reduce Motion converts all to 100ms fade |
| P1.5.5 | `NSVisualEffectView` material wrappers | 0.25d | `.sidebar` and `.hudWindow` render correctly |
| P1.5.6 | Components: `SGButton`, `SGTextField`, `SGChip`, `SGBadge`, `SGProgressRing`, `SGStatusDot`, `SGSkeleton`, `SGToast` | 1d | Each has every state from spec |
| P1.5.7 | Film-grain overlay + ambient-tint modifiers | 0.5d | Grain at 2.5%; tint at 8% / 400ms; both off under Reduce Transparency |
| P1.5.8 | Focus-ring modifier (2pt ring + 4pt glow) | 0.25d | Visible in both appearances |
| P1.5.9 | **Gallery app** — every component × state × appearance × motion setting | 0.5d | Launches, navigable, used for review |

### P1.6 Cheap hedges (1d, run in parallel)

| ID | Task | Est | Done when |
|---|---|---|---|
| P1.6.1 | Throwaway decode benchmark: `AVAssetReader` over ProRes + H.264 at reduced resolution, timed | 0.5d | A realtime-factor number exists on paper |
| P1.6.2 | Throwaway Core ML conversion attempt on the stage-1 encoder | 0.5d | Converts, or fails with a known reason |
| P1.6.3 | **Start RED + Blackmagic RAW SDK registration** | 0.1d | Applications submitted — these have lead time |

> Do P1.6.3 on **day one**. The paperwork blocks P4.9 and nothing else can unblock it.

**Phase 1 exit:** Gallery renders every component in every state, both appearances, both motion
settings. Mock engines produce a 100k-moment library with realistic latency and failures.

---

## Phase 2 — App shell (30d)

All work runs on mocks. No real media, no real models.

### P2.1 Window and chrome (3d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.1.1 | Hidden-titlebar window, size limits, state restoration | 0.5d | Reopens at last size/position |
| P2.1.2 | Custom 52pt toolbar: centred title+count, back/forward, trailing controls | 1d | Pixel-matches reference layout |
| P2.1.3 | Sidebar vibrancy, resize 200–320, auto-collapse <900pt | 0.5d | Collapse is animated and reversible |
| P2.1.4 | Three-pane layout; inspector overlays content <1100pt | 0.5d | No layout jump at the breakpoint |
| P2.1.5 | Scroll-condensing header (`title2`→`headline` + blur past 40pt) | 0.5d | Smooth, no text reflow |

### P2.2 Sidebar (4d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.2.1 | Row component: hover / selected / disabled states | 0.5d | Matches spec §3 |
| P2.2.2 | `matchedGeometryEffect` selection slide | 0.5d | Background travels between rows |
| P2.2.3 | Primary section with live counts | 0.5d | Counts update from repository changes |
| P2.2.4 | Volumes section: status dots, progress ring replacing count, offline 60% treatment | 1d | Ring animates during mock indexing |
| P2.2.5 | Spaces: create/rename/delete, icon picker, drag-reorder | 1d | Persists across relaunch |
| P2.2.6 | Bottom bar: throughput pill, What's new + unread dot, history | 0.5d | Unread dot driven by last-seen-version |

### P2.3 Moment card (5d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.3.1 | Base card, aspect preservation, `e2`→`e3` hover lift | 0.5d | — |
| P2.3.2 | Overlay badges: duration, timecode, codec, dialogue-match | 0.5d | Fade at `micro`; codec badge always on |
| P2.3.3 | **Hover-scrub**: cursor x → `[t_in,t_out]`, filmstrip swap, progress line | 1.5d | Zero perceptible lag; atlas prefetched for visible cards |
| P2.3.4 | Remaining states: selected, keyboard focus, multi-select, loading, offline, error | 1d | All 9 states from spec §4 |
| P2.3.5 | Progressive image loading (4×4 placeholder → sharp) | 0.5d | No empty rectangles ever visible |
| P2.3.6 | Snapshot tests, all states × both appearances | 1d | ~18 snapshots green in CI |

### P2.4 Grid (7d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.4.1 | `GridBackend` protocol + masonry layout engine (column balancing) | 1.5d | Balanced columns, stable across resize |
| P2.4.2 | Virtualization + view recycling | 1.5d | Constant memory while scrolling 100k |
| P2.4.3 | SwiftUI `LazyVGrid` backend | 1d | — |
| P2.4.4 | Selection model: single, shift-range, cmd-multi | 1d | — |
| P2.4.5 | Keyboard navigation (arrows, shift-extend, Home/End) | 0.5d | Held-arrow traversal animates ≤100ms |
| P2.4.6 | Density control `⌘+`/`⌘-`, Grid and List modes | 0.5d | Mode persists per Space |
| P2.4.7 | **Perf gate: 60fps floor on 100k fixtures** | 1d | Instruments trace attached to the PR |
| P2.4.8 | *(conditional)* `NSCollectionView` backend | +3d | Only if P2.4.7 fails |

> **P2.4.7 is the Phase 2 gate.** If SwiftUI cannot hold 60fps, do P2.4.8 immediately —
> the protocol in P2.4.1 exists precisely so this swap costs three days, not three weeks.

### P2.5 Search (5d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.5.1 | Search field, focus expand 280→420 | 0.25d | — |
| P2.5.2 | Query parser → structured chips (mock rules) | 1d | Dates, cameras, codecs extract correctly |
| P2.5.3 | Chip component, insert animation, removal | 0.5d | — |
| P2.5.4 | Recent searches dropdown | 0.25d | — |
| P2.5.5 | **Progressive results**: stage-1 render + refinement bar | 1d | Skeleton within 80ms of keystroke |
| P2.5.6 | **Pointer-idle gate (400ms) + staggered FLIP reorder** | 1.5d | Nothing moves while the pointer moves |
| P2.5.7 | *Best matches* strip (default on) + rank-improved pulse | 0.5d | Main grid never rearranges with default settings |

> P2.5.6 is the hardest interaction in the app. Budget the full 1.5d and test it with the mock
> failing and jittering.

### P2.6 Inspector (4d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.6.1 | Collapsible section container, state persisted | 0.5d | — |
| P2.6.2 | Preview section + player embed | 0.5d | — |
| P2.6.3 | Filmstrip scrubber, in/out handles, **magnetic snap** (12px, 1-frame tick) | 1.5d | Snap is felt, not just seen |
| P2.6.4 | Transcript: virtualized, synced highlight, pause-on-manual-scroll + Resume | 1d | 60fps on a 2-hour transcript |
| P2.6.5 | Matches section with confidence bars | 0.25d | — |
| P2.6.6 | Metadata section, reveal-in-Finder | 0.25d | — |

### P2.7 Player (2d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.7.1 | `AVPlayerLayer` via `NSViewRepresentable` | 0.5d | — |
| P2.7.2 | Transport: Space, **J/K/L shuttle**, frame step, 1s step | 1d | JKL multi-speed matches NLE behaviour |
| P2.7.3 | Frame-accurate seeking | 0.5d | Lands on the exact frame, verified against burned-in TC |

### P2.8 Throughput HUD (2d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P2.8.1 | Collapsed pill, `.hudWindow`, activity ring | 0.5d | — |
| P2.8.2 | Expanded popover: per-volume progress, ETA, thermal, pause/resume | 1d | Pause actually pauses the mock |
| P2.8.3 | Digit roll + auto-hide after 10s idle | 0.5d | Digits never reflow |

**Phase 2 exit:** Navigate, search, preview and scrub a 100k-moment library at 60fps, entirely
on mocks.

---

## Phase 3 — Workflow + chrome (20d)

### P3.1 Selects and bins (2d)
`P3.1.1` bin CRUD · `P3.1.2` add/remove from grid and inspector · `P3.1.3` reorder · `P3.1.4` bin view with running duration

### P3.2 Exporters (5d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P3.2.1 | `Exporter` harness + golden-file test rig | 0.5d | — |
| P3.2.2 | **FCPXML** | 1.5d | Imports into Final Cut with correct TC and in/out |
| P3.2.3 | **Premiere XML** | 1.5d | Imports into Premiere, clips land on the right frames |
| P3.2.4 | **Resolve EDL** | 1d | Round-trips through Resolve |
| P3.2.5 | SRT + CSV | 0.5d | — |

> Each of P3.2.2–4 must be **verified by importing into the actual NLE**, not by reading the XML.
> This is the most common place media tools ship broken output.

### P3.3 Drag-out (1.5d)
`P3.3.1` `NSFilePromiseProvider` · `P3.3.2` drag ghost + target glow · `P3.3.3` drop into Finder and into each NLE

### P3.4 Settings (4d)
One task per tab — General, Library, Indexing, Search, Playback, Export, Shortcuts, Privacy, Updates, Advanced (0.4d each). **Done when:** every control applies immediately, every non-obvious control carries a one-line explanation, destructive actions state exactly what is lost.

### P3.5 Shortcuts (3d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P3.5.1 | Keymap engine + persistence | 1d | — |
| P3.5.2 | Conflict detection | 0.5d | Conflicts surface before save |
| P3.5.3 | **Premiere / Final Cut / Resolve presets** | 0.5d | Switching preset remaps live |
| P3.5.4 | `⌘/` cheat-sheet overlay, searchable | 0.5d | — |
| P3.5.5 | Menu-bar parity — every action listed with its key | 0.5d | — |

### P3.6 Onboarding + empty states (2d)
`P3.6.1` first-run flow: add a volume, watch it index · `P3.6.2` `MeshGradient` empty states · `P3.6.3` no-results state with suggestions

### P3.7 Release infrastructure (2.5d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P3.7.1 | Sparkle 2 integration, EdDSA keypair, appcast | 1d | Test update installs end to end |
| P3.7.2 | Release script: **notarize → staple → generate appcast → push** | 0.5d | Order enforced in the script, not in your head |
| P3.7.3 | Changelog: one markdown per release → Sparkle notes + in-app *What's new* | 0.5d | Single source of truth |
| P3.7.4 | Licensing: signed license files, **offline activation** | 0.5d | Activates with networking disabled |

### P3.8 Accessibility pass (2d)
`P3.8.1` VoiceOver labels for cards, grid position, transcript · `P3.8.2` contrast audit both appearances · `P3.8.3` full keyboard operability + no focus traps · `P3.8.4` Reduce Motion / Reduce Transparency verification

**Phase 3 exit:** A complete, demoable, shippable-looking app with no real AI.
**→ Run the 10 customer interviews here.**

---

## Phase 4 — Real ingest (25d)

Swap `MockIngestEngine` for the real pipeline behind the unchanged protocol.

| ID | Epic / Task | Est | Done when |
|---|---|---|---|
| P4.1 | Volume discovery, crawl, security-scoped bookmarks | 2d | Survives unplug/replug and relaunch |
| P4.2 | Probe: container, codec, duration, fps, timecode, camera metadata | 2d | Correct on a 20-file mixed corpus |
| P4.3 | **Single-pass decode at target resolution** (VideoToolbox, 6K→336px) | 4d | One pass yields thumbs + scene signal + embed frames |
| P4.4 | Shot segmentation (histogram + pHash delta, whip-pan guard) | 3d | Precision/recall measured against 50 hand-marked clips |
| P4.5 | Thumbnail + filmstrip atlas generation | 1.5d | — |
| P4.6 | Audio: extract, VAD, `SpeechAnalyzer` (26+) / whisper.cpp (15–25), diarization | 4d | Provider swaps by OS version at runtime |
| P4.7 | OCR via Vision | 1d | — |
| P4.8 | Attributes: shot size, camera move, dominant color | 2d | — |
| P4.9 | Camera originals: FFmpeg long tail, **RED SDK**, **BRAW SDK** | 3d | R3D and BRAW index without transcoding *(blocked by P1.6.3)* |
| P4.10 | Governor: thermal, power source, foreground-app awareness | 1.5d | Indexing yields when Resolve comes forward |
| P4.11 | Checkpoint + resume per asset | 1d | Unplug mid-index, replug, resumes exactly |

> ### 🚦 GATE P4 — **≥5× realtime on the mixed codec set**
> Measured on target hardware across H.264/HEVC/ProRes/R3D/BRAW. Focus ships 0.76×.
> If this fails, the terabyte-scale positioning fails with it — stop and reassess before Phase 5.

---

## Phase 5 — Real retrieval (25d)

| ID | Epic / Task | Est | Done when |
|---|---|---|---|
| P5.1 | **Benchmark harness first**: 150–200 domain clips, 60+ graded queries, NDCG@10 | 3d | Reproducible score for any engine build |
| P5.2 | Stage-1 encoder: Core ML / MLX conversion, ANE scheduling | 5d | Runs on-device at usable throughput *(informed by P1.6.2)* |
| P5.3 | USearch ANN index: build, mmap, incremental add, offline-volume handling | 3d | 1M vectors searchable without loading into RAM |
| P5.4 | Hybrid fusion: ANN + FTS5 + filters via RRF | 2d | Beats either channel alone on the benchmark |
| P5.5 | Real query parser (replaces P2.5.2 mock rules) | 2d | — |
| P5.6 | Stage-2 rerank | 4d | Measurable NDCG lift over stage-1 |
| P5.7 | Temporal grounding → tighten in/out points | 4d | Boundaries land within 0.5s of hand-marked truth |
| P5.8 | Match-evidence extraction | 2d | Every result explains itself |

> ### 🚦 GATE P5 — **Two-stage lift obvious to a stranger watching**
> Not "statistically significant". Show someone stage-1 and stage-2 results side by side; if they
> cannot immediately tell which is better, the rerank is not earning its complexity.

---

## Phase 6 — Archive scale (20d)

| ID | Task | Est | Done when |
|---|---|---|---|
| P6.1 | Offline-volume UX: which drive holds this, plug-in prompts | 3d | Results from unplugged drives are browsable |
| P6.2 | `content_id` dedupe across duplicated project copies | 4d | Same footage on 3 drives indexes once |
| P6.3 | Incremental model migration (re-embed in background on version bump) | 5d | Model upgrade does not force a full re-index |
| P6.4 | Index scheduling (overnight windows) | 2d | — |
| P6.5 | Large-library performance: 40TB / 12 volumes / 1M+ moments | 4d | Search stays sub-400ms |
| P6.6 | Index integrity: verify, repair, rebuild | 2d | Corrupt index recovers without data loss |

---

## Phase 7 — Ship (15d)

`P7.1` notarization + release automation hardening (2d) · `P7.2` crash reporting, opt-in, local-first (2d) ·
`P7.3` licensing/seat management productionisation (3d) · `P7.4` private beta with 10 facilities, feedback loop (5d) ·
`P7.5` support docs, help, website copy (3d)

---

## Phase 8 — Facility tier (post-1.0)

Shared index across a facility · seat management + admin console · network volume coordination ·
central policy for indexing windows.

---

## Working notes

**Parallelisable.** P1.6 hedges run alongside P1.1–1.5. P2.3 (card) and P2.4 (grid) can be
developed against each other's stubs. P3.2 exporters are independent of each other. P4.6 (audio)
is independent of P4.3–4.5 (video) and can run concurrently.

**Critical path.** P1.2.2 (timecode) → P1.3.2 (schema) → P1.4.1 (fixtures) → P2.4 (grid) →
P2.4.7 (perf gate) → P3 → P4.3 (decode) → P4 gate → P5.2 (encoder) → P5 gate.

**Re-estimate after Phase 1.** If Phase 1 lands materially over 15d, scale the remaining
estimates by the same factor rather than assuming you will catch up.

**Two things that block on external parties** — start both on day one: RED/BRAW SDK
registration (P1.6.3) and an Apple Developer ID with notarization tested end to end (P3.7.1).
