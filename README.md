# Seagulla

Local-first semantic **moment search** for large video archives.
Tauri 2 · Rust · SvelteKit · Tailwind CSS.

Describe what you remember — _"interview in the kitchen, late afternoon"_ — and get back the
exact moment with frame-accurate in/out points, ready to hand off to Premiere, Resolve or
Final Cut. Everything runs on-device; footage never leaves the machine.

> **Status: pre-alpha.** Planning complete, implementation starting at Phase 1.

## Why

Adobe, Apple and Blackmagic all ship on-device semantic search inside their NLEs now, so
"search your footage in plain English" is table stakes. Seagulla targets the tail those tools
structurally ignore: **terabyte-scale archives**, offline drives, camera-original formats
(R3D, BRAW, ProRes RAW) without transcoding, deduplication across duplicated project copies,
and results that are _moments_ rather than whole clips.

## Platforms

**Developed on Linux, shipped for macOS first.** Every capability has a cross-platform
implementation; platform acceleration is an optional trait selected at runtime.

| Capability    | Portable     | macOS acceleration                               |
| ------------- | ------------ | ------------------------------------------------ |
| Decode        | FFmpeg       | VideoToolbox                                     |
| Embeddings    | ONNX Runtime | Core ML execution provider                       |
| Speech        | whisper.cpp  | Metal                                            |
| Window chrome | plain window | vibrancy, overlay titlebar, inset traffic lights |

A Linux build is planned as a first-class target — it is nearly free given the shared core, and
it is the only way to use the product daily during development.

## Running it

The UI runs in a plain browser with a TypeScript mock backend — no Rust, no Tauri, no macOS.
That is the development loop on Linux.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

`/gallery` shows every component in every state, both themes.

With the Rust toolchain installed, `pnpm tauri dev` runs the real shell; the backend selector
in `src/lib/ipc/index.ts` switches from the mock to the Tauri bridge automatically.

| Command | Does |
|---|---|
| `pnpm dev` | UI in a browser, against mocks |
| `pnpm check` | Svelte + TypeScript typecheck |
| `pnpm test` | Unit tests (timecode, masonry, mock physics, reorder gate) |
| `pnpm build` | Static bundle |
| `pnpm tauri dev` | Full app, needs Rust |
| `python3 scripts/check_layering.py` | Validate the crate graph |

## Layout

```
src/lib/core/        pure logic — timecode, masonry, query parsing, reorder gate
src/lib/ipc/         backend interface, TS mock, Tauri bridge
src/lib/components/  MomentCard, MomentGrid, Sidebar, Inspector, SearchField, HUD
src/routes/          app shell and /gallery
crates/              nine Rust crates, layering enforced by Cargo
src-tauri/           Tauri shell — commands and window chrome only, no logic
scripts/             architecture manifest and layering checker
```

## Documentation

| Document | Covers |
|---|---|
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Architecture, crate graph, ingest pipeline, two-stage search, risks |
| [`docs/ui-ux-spec.md`](docs/ui-ux-spec.md) | Design tokens, component states, motion, micro-interactions, settings, shortcuts, accessibility, performance budgets |
| [`docs/macos-native-in-tauri.md`](docs/macos-native-in-tauri.md) | Window chrome, vibrancy, typography, menus, and the details that give a web UI away |
| [`docs/execution-plan.md`](docs/execution-plan.md) | Phase-by-phase work breakdown with task IDs, estimates and acceptance criteria |

## License

Proprietary. All rights reserved.
