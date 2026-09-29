# Seagulla

Local-first semantic **moment search** for large video archives.
Tauri 2 · Rust · SvelteKit · Tailwind CSS.

Describe what you remember — *"interview in the kitchen, late afternoon"* — and get back the
exact moment with frame-accurate in/out points, ready to hand off to Premiere, Resolve or
Final Cut. Everything runs on-device; footage never leaves the machine.

> **Status: pre-alpha.** Planning complete, implementation starting at Phase 1.

## Why

Adobe, Apple and Blackmagic all ship on-device semantic search inside their NLEs now, so
"search your footage in plain English" is table stakes. Seagulla targets the tail those tools
structurally ignore: **terabyte-scale archives**, offline drives, camera-original formats
(R3D, BRAW, ProRes RAW) without transcoding, deduplication across duplicated project copies,
and results that are *moments* rather than whole clips.

## Platforms

**Developed on Linux, shipped for macOS first.** Every capability has a cross-platform
implementation; platform acceleration is an optional trait selected at runtime.

| Capability | Portable | macOS acceleration |
|---|---|---|
| Decode | FFmpeg | VideoToolbox |
| Embeddings | ONNX Runtime | Core ML execution provider |
| Speech | whisper.cpp | Metal |
| Window chrome | plain window | vibrancy, overlay titlebar, inset traffic lights |

A Linux build is planned as a first-class target — it is nearly free given the shared core, and
it is the only way to use the product daily during development.

## Documentation

| Document | Covers |
|---|---|
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Architecture, crate graph, ingest pipeline, two-stage search, risks |
| [`docs/ui-ux-spec.md`](docs/ui-ux-spec.md) | Design tokens, component states, motion, micro-interactions, settings, shortcuts, accessibility, performance budgets |
| [`docs/macos-native-in-tauri.md`](docs/macos-native-in-tauri.md) | Window chrome, vibrancy, typography, menus, and the details that give a web UI away |
| [`docs/execution-plan.md`](docs/execution-plan.md) | Phase-by-phase work breakdown with task IDs, estimates, dependencies and acceptance criteria |

## Stack

- **Shell** — Tauri 2, system webview, native window control
- **Frontend** — SvelteKit (`adapter-static`, SSR off), Tailwind CSS v4, TypeScript strict
- **Core** — Rust workspace, nine crates, layering enforced by Cargo
- **Storage** — SQLite with FTS5; USearch for vector ANN
- **Media** — FFmpeg, plus RED and Blackmagic RAW SDKs (both ship Linux builds)
- **Inference** — ONNX Runtime; whisper.cpp for speech

## License

Proprietary. All rights reserved.
