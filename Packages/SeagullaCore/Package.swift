// swift-tools-version: 6.0
// Seagulla — local module graph.
//
// Layering is enforced by this file: a target cannot import a module it does not
// declare a dependency on. `Scripts/check_layering.py` additionally validates that
// the declared graph matches the intended architecture, so that adding a forbidden
// dependency here fails CI rather than silently eroding the design.

import PackageDescription

let package = Package(
  name: "SeagullaCore",
  platforms: [.macOS(.v15)],
  products: [
    .library(name: "SeagullaKit", targets: ["SeagullaKit"]),
    .library(name: "DesignSystem", targets: ["DesignSystem"]),
    .library(name: "PersistenceKit", targets: ["PersistenceKit"]),
    .library(name: "MediaIO", targets: ["MediaIO"]),
    .library(name: "MLRuntime", targets: ["MLRuntime"]),
    .library(name: "ExportKit", targets: ["ExportKit"]),
    .library(name: "PlatformKit", targets: ["PlatformKit"]),
    .library(name: "IngestEngine", targets: ["IngestEngine"]),
    .library(name: "SearchEngine", targets: ["SearchEngine"]),
    .executable(name: "seagulla-cli", targets: ["SeagullaCLI"]),
  ],
  targets: [
    // Layer 0 — no dependencies.
    .target(name: "SeagullaKit"),
    .target(name: "DesignSystem"),

    // Layer 1 — domain only.
    .target(name: "PersistenceKit", dependencies: ["SeagullaKit"]),
    .target(name: "MediaIO", dependencies: ["SeagullaKit"]),
    .target(name: "MLRuntime", dependencies: ["SeagullaKit"]),
    .target(name: "ExportKit", dependencies: ["SeagullaKit"]),
    .target(name: "PlatformKit", dependencies: ["SeagullaKit"]),

    // Layer 2 — engines compose layer 1.
    .target(
      name: "IngestEngine",
      dependencies: ["SeagullaKit", "MediaIO", "MLRuntime", "PersistenceKit"]
    ),
    .target(
      name: "SearchEngine",
      dependencies: ["SeagullaKit", "PersistenceKit", "MLRuntime"]
    ),

    // Layer 3 — executables.
    .executableTarget(
      name: "SeagullaCLI",
      dependencies: ["SeagullaKit", "PersistenceKit", "IngestEngine", "SearchEngine"]
    ),

    // Tests.
    .testTarget(name: "SeagullaKitTests", dependencies: ["SeagullaKit"]),
    .testTarget(name: "DesignSystemTests", dependencies: ["DesignSystem"]),
    .testTarget(name: "PersistenceKitTests", dependencies: ["PersistenceKit"]),
    .testTarget(name: "MediaIOTests", dependencies: ["MediaIO"]),
    .testTarget(name: "MLRuntimeTests", dependencies: ["MLRuntime"]),
    .testTarget(name: "ExportKitTests", dependencies: ["ExportKit"]),
    .testTarget(name: "PlatformKitTests", dependencies: ["PlatformKit"]),
    .testTarget(name: "IngestEngineTests", dependencies: ["IngestEngine"]),
    .testTarget(name: "SearchEngineTests", dependencies: ["SearchEngine"]),
  ],
  swiftLanguageModes: [.v6]
)
