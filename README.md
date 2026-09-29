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

Seagulla is a **desktop app**. `pnpm tauri dev` opens a real window.

### First time

```bash
# Rust toolchain (user-local, no sudo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Tauri's Linux dependencies (Ubuntu/Debian)
sudo apt install -y libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev build-essential curl file libssl-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf

pnpm install
```

### Every time

```bash
pnpm tauri dev      # desktop window, hot reload
```

| Command | Does |
|---|---|
| `pnpm tauri dev` | **The app.** Desktop window with hot reload. |
| `pnpm tauri build` | Packaged binary — `.deb`/AppImage on Linux, `.app`/`.dmg` on macOS |
| `pnpm dev` | UI only, in a browser at `:5173` — faster loop for pure frontend work |
| `pnpm check` | Svelte + TypeScript typecheck |
| `pnpm test` | Frontend unit tests |
| `cargo test --workspace` | Rust tests |
| `python3 scripts/check_layering.py` | Validate the crate graph |

Both entry points run the same UI. In a browser it uses the TypeScript mock backend; in the
desktop window it will use the Tauri bridge once the Rust engines land — the selector in
`src/lib/ipc/index.ts` chooses automatically.

`/gallery` shows every component in every state, both themes.

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
