# Implementation Plan — Seagulla

macOS-only · SwiftUI · Apple Silicon · local-first moment search for large video archives

> **Stated assumption:** this plan targets **Path B** from the market research — professional
> post-production facilities and serious independents, sold per seat annually. That choice drives
> several decisions below (camera-original codecs, NLE round-trip, offline activation, seat
> licensing). If you intend Path A (prosumer one-time) or Path C (legal/compliance vertical),
> say so — roughly 30% of this plan changes.
>
> **Revised 2026-09-28:** build order is now **UI-first against mocks**. See §9.

---

## 0. Product definition in one paragraph

A native macOS app that indexes terabyte-scale video archives — including offline drives and
camera-original formats — and answers natural-language queries with **frame-accurate moments**,
not files. Results carry in/out points, a scrubbable filmstrip, an explanation of why they
matched, and hand off directly to Premiere / Resolve / Final Cut. It runs entirely on-device.

The two things that must be true for this to beat the free NLE features:
1. **Throughput.** It indexes archives the built-in tools cannot (offline volumes, R3D/BRAW, 100+ drives).
2. **Precision.** It returns a moment with in/out points, not a clip you still have to scrub.

Everything below serves those two claims.

---

## 1. Platform & language decisions

| Decision | Choice | Rationale |
|---|---|---|
| Min OS | **macOS 15 Sequoia** | Post facilities upgrade slowly (plugin compatibility). Excluding them is a revenue decision, not a technical one. |
| Architecture | **Apple Silicon only** | ANE + unified memory are load-bearing. Intel doubles the perf work for a shrinking base. Invenio ships this way. |
| Language | **Swift 6**, strict concurrency | Actors map cleanly onto the pipeline's bounded worker pools. |
| UI | **SwiftUI**, AppKit where justified | See §6 for the specific places AppKit wins. |
| Distribution | **Direct download**, Developer ID + notarized | MAS sandbox is hostile to external-volume crawling and to RED/BRAW SDK linkage. Also enables trials and seat licensing. |

**Transcription is version-gated.** Apple's `SpeechAnalyzer` / `SpeechTranscriber` (macOS 26+) runs
~2.2× faster than Whisper Large V3 with *better* measured accuracy (12 word edits / 607 words vs
whisper.cpp's 26). That is a large throughput win on a stage you run over every asset. Abstract
behind a `TranscriptionProvider` protocol; SpeechAnalyzer on 26+, whisper.cpp with Metal on 15–25.

---

## 2. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  App (SwiftUI)   Library · Search · Inspector · Player · Prefs  │
├─────────────────────────────────────────────────────────────────┤
│  DesignSystem    tokens · components · materials · motion       │
├───────────────┬─────────────────────────┬───────────────────────┤
│ SearchEngine  │   IngestEngine          │  ExportKit            │
│ · query parse │   · discovery/crawl     │  · FCPXML             │
│ · ANN recall  │   · probe               │  · Premiere XML       │
│ · FTS recall  │   · decode+sample       │  · Resolve EDL/AAF    │
│ · fusion(RRF) │   · shot segmentation   │  · SRT / CSV          │
│ · rerank      │   · embed               │  · drag-out promises  │
│ · grounding   │   · audio/ASR/diarize   │                       │
│               │   · OCR/faces/attrs     │                       │
├───────────────┴──────┬──────────────────┴───────────────────────┤
│  MLRuntime           │  MediaIO                                 │
│  · Core ML / MLX     │  · AVFoundation + VideoToolbox (HW)      │
│  · model registry    │  · FFmpeg (libav*) for long tail         │
│  · version pinning   │  · RED SDK (.r3d) · BRAW SDK (.braw)     │
│  · ANE/GPU scheduling│  · proxy resolution                      │
├──────────────────────┴──────────────────────────────────────────┤
│  PersistenceKit   GRDB/SQLite · USearch ANN · thumbnail store   │
├─────────────────────────────────────────────────────────────────┤
│  PlatformKit   volumes · bookmarks · power/thermal · licensing  │
└─────────────────────────────────────────────────────────────────┘
```

Swift Package Manager modules, one per box. **`IngestEngine` and `SearchEngine` must be driveable
headlessly from a CLI target** — that is how you run the throughput and retrieval benchmarks, and
how you regression-test without a UI. Build the CLI first (§9 Phase 0).

### 2.1 Persistence

**Use GRDB (SQLite), not SwiftData.** SwiftData is unproven at millions of rows, gives poor
control over index shape and migration timing, and you will need both. GRDB gives explicit
migrations, WAL concurrency, FTS5 for transcript/OCR search, and predictable query plans.

**Vector index: USearch.** Swift bindings, HNSW, quantization, and — critically — it can view a
large index from disk without loading it into RAM. That is exactly the offline/huge-archive
requirement. `sqlite-vec` is the simpler fallback if USearch's Swift layer causes friction.

### 2.2 Core schema (abbreviated)

```
volume(id, uuid, name, label_color, last_seen_at, is_online, capacity, security_bookmark)
asset(id, volume_id, rel_path, content_id, duration, codec, w, h, fps,
      tc_start, camera_meta_json, proxy_of, index_state, index_version, mtime, size)
moment(id, asset_id, t_in, t_out, kind, thumb_ref, quality_score)
embedding(moment_id, model_id, dim, vec_rowid)        -- vec lives in USearch
transcript_seg(id, asset_id, t_in, t_out, text, speaker_id, confidence)
ocr_seg(id, asset_id, t_in, t_out, text, bbox)
face(id, asset_id, moment_id, person_id, embedding_rowid, bbox)
person(id, display_name, cover_face_id)
attr(moment_id, key, value)        -- shot_size, camera_move, dominant_color, …
tag / collection / collection_item / saved_search / select_bin
```

Three schema decisions that matter later:

1. **`content_id`** — stable identity from size + mtime + hash of head/tail bytes. Lets you
   recognise the same footage when it moves drives or is duplicated across project copies.
   Dedupe across duplicated archives is real, common and completely unaddressed by competitors.
2. **`index_version` per asset, per model** — when you upgrade an embedding model you must be able
   to re-index incrementally in the background. Forcing a full re-index of a 40TB archive would be
   product-ending. Design for model migration on day one.
3. **`proxy_of`** — index the proxy, seek the original. Facilities already generate proxies; using
   them is free throughput.

---

## 3. The ingest pipeline (this is the moat)

```
discover → probe → decode+sample → segment → embed ─┐
                        │                            ├→ persist → index
                        └→ audio → VAD → ASR → diarize
                        └→ OCR → faces → attributes
```

**Non-negotiable engineering rules:**

- **One decode pass produces everything.** Thumbnails, scene-change signal, embedding frames and
  attribute frames all come off the same decoded stream. Decoding twice is the single biggest
  performance mistake available here.
- **Decode at target resolution, never source resolution.** 6K → 336px. VideoToolbox will scale
  during decode; use it. This is the trick FrameQuery markets and it is worth a large multiple.
- **Hardware decode by default** (VideoToolbox), FFmpeg only for the long tail, vendor SDKs for
  R3D/BRAW with GPU debayer.
- **Checkpoint per asset, resume anywhere.** Unplugging a drive mid-index must be a non-event.
- **Budget governor.** Thermal state, power source, foreground-app awareness. An indexer that makes
  the editor's Resolve session stutter gets uninstalled that day. Expose "index while I'm away".
- **Separate worker pools.** Decode workers are bounded by VideoToolbox session limits; embed
  workers by ANE/GPU. Different pools, explicit backpressure between them.

**Shot segmentation is what makes moments possible.** Run scene-change detection on the already
decoded downscaled frames (histogram + perceptual-hash delta, with a motion guard against false
cuts on whip pans). Shots become the unit of retrieval. Without this you are stuck returning whole
clips like everyone else.

**Throughput target: ≥5× realtime** on mixed H.264/HEVC/ProRes on an M-series Pro. Focus publishes
0.76×. At 5×+ you have a claim no competitor can currently make — measurable, demonstrable, and
hard to copy quickly.

---

## 4. Search architecture (two-stage)

```
query text
   │
   ├─ parse ──→ semantic string + structured filters
   │             ("interviews in the kitchen shot on Alexa last March")
   │
   ├─ STAGE 1 · RECALL  (whole archive, must be milliseconds)
   │    ├─ ANN over moment embeddings        → top 300
   │    ├─ FTS5 over transcripts + OCR       → top 300
   │    ├─ metadata/attribute filters        → constrain
   │    └─ Reciprocal Rank Fusion            → top 100
   │
   └─ STAGE 2 · RERANK + LOCALIZE  (top ~50 only)
        ├─ cross-modal reranker
        ├─ temporal grounding → tighten t_in/t_out
        └─ evidence extraction → why it matched
```

- **Stage 1 model:** a bi-encoder producing indexable vectors. `Qwen3-VL-Embedding-2B` is the
  leading candidate (Apache-2.0, native video-text, Matryoshka dims 64–2048 so you can store small
  vectors for the archive index and rerank at full width). Core ML / MLX conversion feasibility is
  **unvalidated and is a Phase-1 risk** — SigLIP-2 is the fallback.
- **Stage 2:** reranking plus temporal grounding. Mage-VL is the quality reference
  (Timelens-QVHighlight 57.4 vs Qwen3-VL-4B's 34.9) but is CUDA-only today with no MLX port — treat
  local stage 2 as a research track, and consider an optional remote-GPU tier.
- **Explainability is a feature.** Every result shows what matched — the transcript line, the
  visual concept, the OCR hit. The universal complaint in this category is plausible false
  positives; showing evidence converts an error into a *legible* error, which users forgive.

---

## 5. Core features (v1 scope)

**Must ship in 1.0**
1. Natural-language moment search — visual + speech + OCR + metadata, hybrid fusion
2. Moment results with frame-accurate in/out + hover-scrub filmstrip
3. Volume/archive management — online/offline drives, per-volume index state, "plug in *Archive 07*"
4. Camera-original support — ProRes, H.264/HEVC, R3D, BRAW; proxy-aware indexing
5. Selects/bins + export: FCPXML, Premiere XML, Resolve EDL, SRT, CSV; drag-out to NLE
6. Transcript view with synced playhead; click a line to seek
7. Similar-shot search (query by frame or by dropped image)
8. Saved searches as Spaces (see §6)
9. Indexing control centre — throughput, queue, pause/resume, scheduling
10. Sparkle updater + in-app changelog + licensing

**Deliberately deferred**
- Faces/people — Vision gives it cheaply, but it invites privacy questions. Ship 1.1 with explicit
  opt-in and an eye on jurisdictional biometric rules.
- Shared/team index across a facility — the Path-B expansion, 2.0
- Windows — don't

---

## 6. UI/UX — adapting the reference design

> **Full specification: [`ui-ux-spec.md`](ui-ux-spec.md).** That document is authoritative for
> tokens, component states, motion, micro-interactions, settings, shortcuts, accessibility and
> performance budgets. This section is the summary.

The reference (Eagle/Pile lineage) maps well. **The one structural change: a grid cell is a
*moment*, not a file.** Everything else follows.

### Window
Hidden titlebar, full-size content view, `NSVisualEffectView` sidebar material, rounded corners,
translucent chrome over the desktop. Keep the reference's floating, light feel — that contrast
against Avid/Resolve grey *is* the premium signal.

### Sidebar (~240pt)
- **Top pill group:** `+` (add volume / folder) and sidebar toggle — as in the reference
- **Primary:** All Moments · Inbox (newly indexed) · Starred · Tags · Trash, counts right-aligned
- **Volumes** section — ours, not the reference's. Each drive gets a status dot (online / offline /
  indexing) and, while indexing, a thin progress ring in place of the count. This section is the
  product's differentiator made visible every time the app opens.
- **Spaces** section — lifted directly from the reference. User-created saved searches with colored
  emoji icons. Perfect fit: "Interviews", "B-roll — coastline", "Client selects".
- **Bottom bar:** indexing status pill (replaces the reference's small pill) · **What's new** with
  an unread dot · recent-searches history icon

### Main area
- Centre title: icon + name + count, exactly as the reference's "Visual 41"
- Left: back/forward chevrons. Right: search, filter, inspector toggle
- **Content: masonry grid of moments.** Each cell — poster frame, ~10pt corner radius, soft shadow.
  On hover, horizontal cursor position scrubs the moment and reveals duration + source timecode.
  Badges for codec and for "matched in dialogue". Accent ring on selection.
- The reference's floating bottom-right pill becomes the **throughput HUD**:
  *"Indexing 3 volumes · 4.2× realtime"*, expanding on click.

### Inspector (right, toggleable)
Metadata · transcript with synced playhead · match evidence · in/out trim · export actions.

### Premium details that actually register
- 8pt grid, SF Pro, SF Symbols, asset-catalog colors for true light/dark
- `matchedGeometryEffect` for grid → detail; springs, never linear easing
- Skeleton shimmer while indexing; considered empty states
- **Keyboard-first.** `⌘F` search, `J/K/L` transport, `I/O` in-out, space to play, arrows to
  navigate. Editors live on the keyboard; this reads as respect for the craft and costs little.
- Quick Look-style instant preview on space

### Where AppKit beats SwiftUI here
- **The grid.** SwiftUI `LazyVGrid` degrades past a few thousand image cells. Build behind a
  protocol so you can swap in `NSCollectionView` via `NSViewRepresentable` when profiling says so.
  Assume you will need to.
- The video surface (`AVPlayerLayer`), and anything needing precise scroll-position control.
- Thumbnails from a sprite-atlas store with `NSCache`, downsampled at write time, with in-flight
  cancellation on fast scroll. This is where perceived quality is won or lost.

---

## 7. Release infrastructure (explicitly requested)

- **Updater: Sparkle 2.** EdDSA (ed25519) signed appcast + delta updates via `generate_appcast`.
  **Order matters: notarize the DMG → staple → *then* generate the appcast entry → then push.**
  Getting that order wrong shows every user an "update is corrupted" dialog.
- **Changelog: one source of truth.** A markdown file per release renders both the Sparkle release
  notes and the in-app *What's new* sheet reached from the sidebar. Unread dot driven by
  last-seen-version in defaults.
- **Licensing:** signed license files with offline activation. Air-gapped facilities are a real
  segment and a competitive advantage — do not require a phone-home.
- **Diagnostics:** opt-in, local-first. No filenames, no paths, no footage metadata ever leaves the
  machine, and say so in the UI. In this segment privacy is a sales argument.
- **Observability:** OSLog + `signpost` throughout the ingest pipeline. You cannot optimize
  throughput you cannot see, and throughput is the product.

> Budget **20–30% of total project time** for distribution, signing, notarization, licensing and
> update infrastructure. It is not glue code; it is its own product.

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Stage-1 model won't convert to Core ML/MLX cleanly | High | Validate in Phase 1 before any UI. SigLIP-2 fallback. |
| Local retrieval quality stays ~0.47 NDCG@10 | High | Two-stage rerank is the whole answer. If it doesn't lift measurably, reconsider. |
| All-intra ProRes kills codec-level sampling tricks | Medium | Test early; if true, lean harder on decode-resolution and HW decode wins. |
| RED/BRAW SDK licensing or Apple Silicon friction | Medium | Registration is free but gated; start the paperwork in Phase 0. |
| SwiftUI grid perf at 100k+ cells | Medium | Protocol boundary from day one; NSCollectionView escape hatch. |
| Adobe/Apple ship archive-scale features | Medium | They optimize for the median project. Stay at the tail: offline volumes, RAW, dedupe. |
| Scope creep into "AI editor" | High | Wideframe/Mosaic/Eddie own that. Search and hand off. Don't build a timeline. |

---

## 9. Phased roadmap

**Build order: UI-first against a mock engine.** Phases 0 and 1 (the ingest and retrieval
spikes) are deferred, not deleted — they become Phase 4 and Phase 5.

### Why this works, and the one condition

Building the shell first is legitimate: it de-risks the part that is hardest to change later
(UX and information architecture), it gives you something demoable for customer interviews, and
forcing a mock boundary produces clean protocol design for free.

It fails in exactly one way: you build a beautiful app whose real engine can't meet the
assumptions the UI was designed around. The mitigation is non-negotiable —

> **The mock must lie about content, never about physics.**

`MockIngestEngine` and `MockSearchEngine` must reproduce realistic behaviour:
- **Latency.** Search returns in 80–400ms with jitter, not instantly.
- **Progressive results.** Stage-1 recall arrives first; stage-2 reranked/localized results
  replace them 200–900ms later. The UI must be designed for results that *change under you*.
- **Throughput.** Indexing advances at a plausible realtime factor (default 3×), not instantly.
- **Failure.** Volumes go offline mid-index. Assets fail to decode. Models fail to load.
  Roughly 2% of operations should fail by default, configurable.
- **Scale.** Ship a generated fixture library of 100k+ moments across 12 volumes so grid
  performance is exercised from day one.
- **Imperfection.** Mock results must include plausible false positives, because handling them
  gracefully is a core UX problem (see §4, explainability).

A debug menu exposes these knobs (latency, failure rate, throughput, library size) so the UI can
be tested against hostile conditions on demand.

### Phases

- **Phase 1 — Foundation + design system (~3 weeks).**
  SPM workspace, module skeletons, all engine protocols defined, `MockIngestEngine` /
  `MockSearchEngine` / fixture generator. `DesignSystem` module: tokens, materials, motion,
  components in an internal gallery app. No product screens yet.

- **Phase 2 — The app shell (~6 weeks).**
  Window chrome, sidebar, masonry moment grid, search, inspector, player, hover-scrub.
  Everything runs on mocks. **Exit bar: 60fps floor while scrolling a 100k-moment fixture
  library.** If the grid can't hold that on mock data, it will never hold on real data.

- **Phase 3 — Workflow + chrome (~4 weeks).**
  Selects, bins, exporters (FCPXML / Premiere XML / Resolve EDL / SRT / CSV), drag-out,
  transcript view, Settings, shortcuts + cheat sheet, onboarding, Sparkle, changelog, licensing.
  **At the end of Phase 3 you have a complete, demoable, shippable-looking app with no real AI.**
  Use it for the 10 customer interviews.

- **Phase 4 — Real ingest (~5 weeks).** *(was Phase 0)*
  Swap `MockIngestEngine` for the real pipeline behind the same protocol. Decode, downscale,
  scene detect, thumbnails in one pass. VideoToolbox, FFmpeg, RED/BRAW SDKs.
  **Gate: ≥5× realtime on the mixed codec set.** Start SDK registration during Phase 1 — the
  paperwork has lead time.

- **Phase 5 — Real retrieval (~5 weeks).** *(was Phase 1)*
  Swap `MockSearchEngine`. Core ML / MLX conversion of the stage-1 encoder, ANN index, hybrid
  fusion, stage-2 rerank. Benchmark harness: 150–200 domain clips, 60+ graded queries.
  **Gate: two-stage lift is obvious to a stranger watching.**

- **Phase 6 — Archive scale (~4 weeks).**
  Volumes, offline drives, `content_id` dedupe, scheduling, incremental model migration.

- **Phase 7 — Ship.** Notarization, crash reporting, private beta.

- **Phase 8 — Facility tier.** Shared index, seat management, admin controls.

### The risk you are accepting

The two kill criteria now sit at week ~13 and ~18 instead of week 4 and 8. You will have
invested roughly three months of UI work before learning whether the engine can hit 5× realtime
or whether local retrieval quality is usable. That is a real cost, consciously taken — the
upside is a demoable product for customer conversations far earlier, and protocol boundaries
proven by a second implementation.

Two cheap hedges worth taking in Phase 1, each a day or two:
1. A throwaway decode benchmark — no pipeline, just `AVAssetReader` over a ProRes and an H.264
   file at reduced resolution, timed. Tells you the order of magnitude immediately.
2. A throwaway Core ML conversion attempt on the stage-1 encoder. If it converts at all, the
   biggest Phase-5 risk drops sharply.

## 10. Open decisions

1. **Name.** "Moment Search" is taken by a direct competitor. Needed before any public artifact.
2. **Path confirmation.** B assumed. C (legal/compliance) would add chain of custody, audit logs,
   redaction and defensibility — and roughly triple the ceiling.
3. **macOS 15 vs 26 minimum.** 26 gets SpeechAnalyzer's 2.2× transcription speedup for free;
   15 keeps conservative facilities. Recommend 15 with a gated fast path.
4. **Stage-2 locality.** Pure local (quality ceiling) vs optional remote GPU (quality, but breaks
   the "never leaves your machine" claim unless made explicit and per-library).

## Sources
- [USearch](https://github.com/unum-cloud/USearch) · [SQLite-Vector](https://www.sqlite.ai/sqlite-vector) · [MetalANNS benchmarks](https://github.com/christopherkarani/MetalANNS)
- [Sparkle](https://sparkle-project.org/) · [Delta updates](https://sparkle-project.org/documentation/delta-updates/) · [Notarized + Sparkle indie playbook 2026](https://erseltrhn.medium.com/shipping-a-notarized-sparkle-updated-macos-app-in-2026-the-indie-playbook-5df44d4cdda9)
- [Apple SpeechAnalyzer vs Whisper (MacStories)](https://www.macstories.net/stories/hands-on-how-apples-new-speech-apis-outpace-whisper-for-lightning-fast-transcription/) · [40-speaker Mac benchmark](https://dev.to/iravoice/apple-speechanalyzer-vs-whispercpp-a-40-speaker-mac-benchmark-40i4)
- [Qwen3-VL-Embedding](https://huggingface.co/Qwen/Qwen3-VL-Embedding-8B) · [Mage-VL](https://huggingface.co/microsoft/Mage-VL)
