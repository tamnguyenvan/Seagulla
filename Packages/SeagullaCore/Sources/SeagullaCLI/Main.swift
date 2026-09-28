//
//  Main.swift
//  Seagulla
//

import Foundation
import IngestEngine
import PersistenceKit
import SeagullaKit
import SearchEngine

/// Headless entry point for Seagulla's engines.
///
/// From Phase 4 this drives ingest and retrieval benchmarks without launching the app,
/// which is how throughput and NDCG numbers are produced reproducibly. For now it reports
/// the linked module graph, which doubles as a runtime check that every module links.
@main
struct SeagullaCommandLine {
  /// Tool version, independent of the application version.
  static let version = SemanticVersion(major: 0, minor: 1, patch: 0)

  static func main() {
    let arguments = Array(CommandLine.arguments.dropFirst())

    switch arguments.first ?? "modules" {
    case "modules":
      printModules()
    case "version", "--version":
      print(version.description)
    case "help", "--help", "-h":
      printUsage()
    case let unknown:
      let message = "seagulla-cli: unknown command '\(unknown)'\n"
      FileHandle.standardError.write(Data(message.utf8))
      printUsage()
      exit(2)
    }
  }

  /// Modules linked into this executable, with their architectural layer.
  private static var linkedModules: [(name: String, layer: Int)] {
    [
      (SeagullaKitModule.name, SeagullaKitModule.layer),
      (PersistenceKitModule.name, PersistenceKitModule.layer),
      (IngestEngineModule.name, IngestEngineModule.layer),
      (SearchEngineModule.name, SearchEngineModule.layer),
    ]
  }

  private static func printModules() {
    print("seagulla-cli \(version) — linked modules")
    for module in linkedModules.sorted(by: { ($0.layer, $0.name) < ($1.layer, $1.name) }) {
      print("  layer \(module.layer)  \(module.name)")
    }
  }

  private static func printUsage() {
    print(
      """
      usage: seagulla-cli <command>

      commands:
        modules   List linked modules and their architectural layer (default)
        version   Print the tool version
        help      Show this message
      """
    )
  }
}
