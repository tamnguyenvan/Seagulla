//
//  ExportKitModule.swift
//  Seagulla
//

import Foundation

/// Timeline interchange writers: FCPXML, Premiere XML, Resolve EDL, SRT, CSV.
///
/// This enum is the module's build-time identity. It exists from Phase 1 so that every
/// module has a compiled public surface, and so tests can assert the module graph links
/// as intended. See `Scripts/architecture.json` for the authoritative layer definitions.
public enum ExportKitModule: Sendable {
  /// Module name, matching the target name in `Package.swift`.
  public static let name: String = "ExportKit"

  /// Architectural layer. A module may depend only on strictly lower layers.
  public static let layer: Int = 1
}
