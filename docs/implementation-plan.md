# Seagulla — Implementation Plan

Tauri 2 · Rust · SvelteKit · Tailwind CSS · developed on Linux, shipped for macOS first

> Supersedes the SwiftUI plan. Rationale in §1.

---

## 0. Product definition

A desktop app that indexes terabyte-scale video archives — including offline drives and
camera-original formats — and answers natural-language queries with **frame-accurate moments**,
not files. Results carry in/out points, a scrubbable filmstrip, an explanation of why they
matched, and hand off directly to Premiere / Resolve / Final Cut. Everything runs on-device.

Two claims must hold to beat the free search built into every modern NLE:

1. **Throughput.** It indexes archives the built-in tools cannot — offline volumes, R3D/BRAW, 100+ drives.
2. **Precision.** It returns a moment with in/out points, not a clip you still have to scrub.

---

## 1. The constraint that shapes everything

**Development happens on Linux. The product ships for macOS.**

This is not a minor inconvenience. It rules out the entire Apple-framework approach that the
previous plan rested on:

| Previously planned          | Problem                      | Replacement                                                          |
| --------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| SwiftUI                     | Cannot build or run on Linux | **Tauri 2 + SvelteKit**                                              |
| AVFoundation / VideoToolbox | macOS-only                   | **FFmpeg** (`ffmpeg-next`), with VideoToolbox as a macOS hwaccel     |
| Core ML / MLX               | macOS-only                   | **ONNX Runtime** (`ort`), with Core ML as a macOS execution provider |
| `SpeechAnalyzer` (macOS 26) | Swift-only, macOS-only       | **whisper.cpp** (`whisper-rs`), Metal on macOS, CPU/CUDA on Linux    |
| Vision OCR                  | macOS-only                   | ONNX OCR (PaddleOCR export), deferred past v1                        |

The principle: **every capability has a cross-platform implementation that runs on Linux, and
platform acceleration is an optional trait implementation selected at runtime.** You develop and
debug the real pipeline locally; macOS gains speed, not features.

Two consequences worth stating plainly.

**You cannot dogfood your own product.** For a tool sold on taste to professional editors, that
is a genuine handicap. The mitigation is that the cross-platform core makes a **Linux build
nearly free** — and shipping it means you use the thing you sell. The market research argued for
macOS-first on commercial grounds, and that still holds for _marketing_; it does not require a
macOS-only _codebase_.

**macOS window chrome cannot be seen locally.** Vibrancy, traffic lights and native materials
render only on macOS. See [`macos-native-in-tauri.md`](macos-native-in-tauri.md) for what that
costs and how to keep the loop tight.

---

## 2. Stack

| Layer      | Choice                                    | Why                                                                                       |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Shell      | **Tauri 2**                               | Rust core, system webview, small binaries, real native window control                     |
| Frontend   | **SvelteKit** + `adapter-static`, SSR off | Compiles away; least runtime overhead of the major frameworks, which matters for the grid |
| Styling    | **Tailwind CSS v4**                       | Token-first, and the design system in `ui-ux-spec.md` is already expressed as tokens      |
| Language   | TypeScript, strict                        | —                                                                                         |
| Core       | **Rust workspace**                        | One language from decode to search                                                        |
| Database   | **SQLite** via `rusqlite` + FTS5          | Same engine as the SwiftUI plan; FTS5 for transcripts and OCR                             |
| Vectors    | **USearch** (Rust bindings)               | HNSW, quantization, and views a large index from disk without loading it into RAM         |
| Decode     | **FFmpeg** via `ffmpeg-next`              | Cross-platform; hwaccel selected per platform                                             |
| Inference  | **ONNX Runtime** via `ort`                | Core ML EP on macOS, CUDA/CPU on Linux, one model artifact                                |
| Speech     | **whisper.cpp** via `whisper-rs`          | Metal / CUDA / CPU from one codebase                                                      |
| Camera RAW | RED SDK, Blackmagic RAW SDK               | **Both ship Linux builds** — this survives the platform change                            |

### 2.1 Crate graph

Layering is enforced by Cargo: a crate cannot use what it does not declare in `Cargo.toml`.

```
layer 0  seagulla-core        domain types, no internal deps
layer 1  seagulla-db          SQLite, migrations, repositories, vector index
         seagulla-media       decode, thumbnails, filmstrips, shot detection
         seagulla-ml          ONNX Runtime hosting, model registry, versioning
         seagulla-export      FCPXML, Premiere XML, Resolve EDL, SRT, CSV
         seagulla-platform    volumes, power/thermal, licensing
layer 2  seagulla-ingest      the pipeline
         seagulla-search      query parse, recall, fusion, rerank, grounding
layer 3  seagulla-cli         headless benchmarks
         src-tauri            the app shell; commands and events only
```

`src-tauri` contains **no logic** — only Tauri command handlers that delegate to layer-2 crates
and forward progress events to the frontend. That keeps the whole engine testable with
`cargo test`, headlessly, on Linux.

### 2.2 Frontend architecture

```
src/lib/design/     tokens, primitives, motion  — mirrors ui-ux-spec.md §1
src/lib/components/ MomentCard, MomentGrid, Sidebar, Inspector, SearchField, HUD
src/lib/ipc/        typed Tauri command + event wrappers
src/lib/stores/     Svelte 5 runes
src/routes/         shell layout
```

**Types cross the IPC boundary once.** Rust structs derive `serde` and `ts-rs`, emitting
TypeScript definitions at build time. Hand-written duplicate interfaces are not permitted —
they drift, and the drift shows up as a runtime error in a webview.

---

## 3. Ingest pipeline

```
discover → probe → decode+sample → segment → embed ─┐
                        │                            ├→ persist → index
                        └→ audio → VAD → ASR
                        └→ attributes
```

Rules that survive the platform change unchanged:

- **One decode pass produces everything** — thumbnails, scene-change signal, embedding frames.
- **Decode at target resolution, never source.** 6K → 336px. FFmpeg scales during decode.
- **Hardware decode where available**, selected at runtime: VideoToolbox on macOS, VAAPI/NVDEC
  on Linux, software everywhere else. Same code path, different `hwaccel`.
- **Checkpoint per asset, resume anywhere.** Unplugging a drive mid-index is a non-event.
- **Budget governor** — thermal, power source, foreground-app awareness.
- **Shot segmentation is what makes moments possible.** Histogram + perceptual-hash delta over
  the already-decoded frames, with a motion guard against false cuts on whip pans.

**Throughput target: ≥5× realtime** on mixed H.264/HEVC/ProRes. Measure on Linux first, then on
macOS via CI. Focus (a competitor) publishes 0.76×.

---

## 4. Search

```
query → parse → { semantic string, structured filters }
      → STAGE 1 recall   ANN + FTS5 + filters → RRF fusion → top 100
      → STAGE 2 rerank   cross-modal rerank + temporal grounding → top ~20
```

- **Stage 1** is a bi-encoder exported to ONNX. `Qwen3-VL-Embedding-2B` remains the leading
  candidate — Apache-2.0, native video-text, Matryoshka dimensions 64–2048, so the archive index
  stores small vectors and reranking uses full width. SigLIP-2 is the fallback.
- **ONNX export is now the risk to validate**, replacing Core ML conversion. It is a _lower_
  risk: the export path is better travelled and testable on Linux.
- **Explainability is a feature.** Every result shows what matched. Plausible false positives are
  inevitable; showing evidence converts an error into a legible error, which users forgive.

---

## 5. The grid is now the biggest technical risk

The SwiftUI plan had an escape hatch: if `LazyVGrid` could not hold 60fps, drop to
`NSCollectionView`. **In a webview there is no equivalent escape hatch**, and the target is
100k+ moment cards with live thumbnails and hover-scrub.

Mitigations, in the order they should be attempted:

1. **Virtualized DOM** (`virtua`, which supports Svelte) with aggressive recycling. Expected to
   hold for the common case.
2. **Serve thumbnails over a custom Tauri protocol**, never as base64 data URLs. Data URLs
   duplicate every image in JS heap and will exhaust memory long before 100k.
3. **Sprite atlases for filmstrips** — one texture per moment, not sixteen requests.
4. **Canvas/WebGL renderer** behind the same component interface, if 1–3 are not enough. This is
   the real escape hatch and the reason `MomentGrid` must have a narrow, swappable API from the
   first commit.

The Phase 2 exit gate is unchanged and non-negotiable: **60fps floor scrolling a 100k-moment
fixture library.**

---

## 6. UI/UX

[`ui-ux-spec.md`](ui-ux-spec.md) remains authoritative for tokens, component states, motion,
micro-interactions, settings, shortcuts, accessibility and performance budgets. It was written
platform-neutrally; §14 (implementation notes) is the only part the stack change invalidates.

[`macos-native-in-tauri.md`](macos-native-in-tauri.md) covers how to make a webview feel like a
macOS app: window chrome, vibrancy, traffic lights, typography, scrollbars, menus, and the
specific places where a web UI gives itself away.

---

## 7. Risks

| Risk                                        | Severity | Mitigation                                                     |
| ------------------------------------------- | -------- | -------------------------------------------------------------- |
| Grid cannot hold 60fps at 100k in a webview | **High** | Swappable renderer; canvas/WebGL escape hatch                  |
| Cannot see macOS chrome while developing    | **High** | Thin native shell, CI screenshots, VNC checks                  |
| Cannot dogfood the product                  | Medium   | Ship a Linux build and use it                                  |
| ONNX export of the stage-1 encoder fails    | Medium   | Validate in Phase 1; SigLIP-2 fallback                         |
| WebKitGTK and WKWebView render differently  | Medium   | Both are WebKit — far closer than Chromium; verify in CI       |
| FFmpeg licensing (GPL vs LGPL builds)       | Medium   | Link LGPL build, avoid GPL-only codecs, document               |
| RED/BRAW SDK integration from Rust          | Medium   | Both ship Linux SDKs; FFI shim crate, start registration early |
| Scope creep into "AI editor"                | High     | Search and hand off. Do not build a timeline.                  |

---

## 8. Roadmap

Build order is unchanged: **UI-first against mock engines**, with the ingest and retrieval gates
deferred. The mock rule stands — _the mock must lie about content, never about physics_: realistic
latency, progressive stage-1 → stage-2 results, a 2% failure rate, and a 100k-moment fixture
library from the first commit.

| Phase | Name                                                     | Gate                                     |
| ----- | -------------------------------------------------------- | ---------------------------------------- |
| 1     | Foundation: workspace, crates, mocks, design tokens      | Component gallery renders every state    |
| 2     | App shell on mocks                                       | **60fps on 100k fixtures**               |
| 3     | Workflow + chrome: exports, settings, shortcuts, updater | Demoable; run customer interviews        |
| 4     | Real ingest                                              | **≥5× realtime on mixed codecs**         |
| 5     | Real retrieval                                           | **Two-stage lift obvious to a stranger** |
| 6     | Archive scale: offline volumes, dedupe, model migration  | 40TB library usable                      |
| 7     | Ship: notarization, updater, private beta                | Signed build, 10 beta facilities         |

Task-level breakdown in [`execution-plan.md`](execution-plan.md).

---

## 9. Open decisions

1. **Ship Linux as a first-class target?** Nearly free given the cross-platform core, and it is
   the only way you dogfood. Recommended.
2. **Updater:** Tauri's built-in updater replaces Sparkle. Signing keys still needed, and macOS
   notarization still applies.
3. **Distribution:** direct download, Developer ID signed and notarized. Notarization requires
   Apple tooling — it runs on Codemagic, not locally.
4. **Path B (post facilities) vs Path C (compliance vertical)** — still unconfirmed; see
   `market-research.md` reasoning carried forward in the execution plan.
