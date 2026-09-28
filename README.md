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

## Layout

```
Packages/SeagullaCore/   SwiftPM package — all nine modules and their tests
Seagulla/                Seagulla.app sources
Gallery/                 Gallery.app sources (design-system catalogue)
Scripts/                 Architecture manifest and toolchain-free checks
project.yml              XcodeGen spec for the two app targets
```

The package lives in a subdirectory because Xcode cannot reference a local package
whose directory contains the `.xcodeproj`.

## Module graph

Nine local SwiftPM modules in one package. A target cannot import a module it does not
declare, so layering is enforced by the compiler; `Scripts/check_layering.py` additionally
validates the declared graph against [`Scripts/architecture.json`](Scripts/architecture.json)
so a forbidden dependency fails CI rather than quietly eroding the design.

| Layer | Modules |
|---|---|
| 0 — foundation | `SeagullaKit`, `DesignSystem` |
| 1 — capability | `PersistenceKit`, `MediaIO`, `MLRuntime`, `ExportKit`, `PlatformKit` |
| 2 — engine | `IngestEngine`, `SearchEngine` |
| 3 — application | `Seagulla.app`, `Gallery.app`, `seagulla-cli` |

## Build

Requires Xcode 16+ and an Apple Silicon Mac running macOS 15 or later, plus
`brew install xcodegen swiftlint`.

`Seagulla.xcodeproj` is **generated from [`project.yml`](project.yml)**, not committed —
pbxproj files conflict on every merge and cannot be reviewed. After cloning:

```bash
make bootstrap
```

| Command | Does |
|---|---|
| `make bootstrap` | Check tooling, generate the Xcode project |
| `make build` | Build all package modules |
| `make test` | Swift tests plus both checker self-tests |
| `make preflight` | Toolchain-free checks: module graph and formatting |
| `make lint` | Pre-flight, SwiftLint, swift-format |
| `make format` | Apply swift-format in place |
| `make cli` | Run `seagulla-cli` |
| `make ci` | Everything CI runs, in CI order |

Four entry points: the **Seagulla** and **Gallery** schemes in Xcode, `seagulla-cli` via
`make cli`, and the test suites via `make test`.

## License

Proprietary. All rights reserved.
