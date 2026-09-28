# Seagulla

Local-first semantic **moment search** for large video archives. macOS, SwiftUI, Apple Silicon.

Describe what you remember — *"interview in the kitchen, late afternoon"* — and get back the
exact moment with frame-accurate in/out points, ready to hand off to Premiere, Resolve or
Final Cut. Everything runs on-device; footage never leaves the machine.

> **Status: pre-alpha.** Xcode scaffold only. Build order is UI-first against mock engines —
> see the execution plan below.

## Why

Adobe, Apple and Blackmagic all ship on-device semantic search inside their NLEs now, so
"search your footage in plain English" is table stakes. Seagulla targets the tail those tools
structurally ignore: **terabyte-scale archives**, offline drives, camera-original formats
(R3D, BRAW, ProRes RAW) without transcoding, deduplication across duplicated project copies,
and results that are *moments* rather than whole clips.

## Documentation

| Document | What it covers |
|---|---|
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Architecture, module layering, data model, ingest pipeline, two-stage search, risks |
| [`docs/ui-ux-spec.md`](docs/ui-ux-spec.md) | Design tokens, component states, motion, micro-interactions, settings, shortcuts, accessibility, performance budgets |
| [`docs/execution-plan.md`](docs/execution-plan.md) | Phase-by-phase work breakdown with task IDs, estimates, dependencies and acceptance criteria |

## Stack

- **UI** — SwiftUI, with AppKit where it wins (grid virtualization, `AVPlayerLayer`, vibrancy)
- **Persistence** — GRDB / SQLite with FTS5; USearch for vector ANN
- **Media** — AVFoundation + VideoToolbox, FFmpeg for the long tail, RED and Blackmagic RAW SDKs
- **ML** — Core ML / MLX on-device; `SpeechAnalyzer` (macOS 26+) with whisper.cpp fallback
- **Distribution** — Direct download, Developer ID + notarized, Sparkle 2 updates

## Build

Requires Xcode 16+ and an Apple Silicon Mac running macOS 15 or later.

```bash
open Seagulla.xcodeproj
```

## License

Proprietary. All rights reserved.
