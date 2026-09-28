//
//  DesignSystemModule.swift
//  Seagulla
//

import Foundation

/// Design tokens, materials, motion and shared SwiftUI components. Depends on nothing.
///
/// This enum is the module's build-time identity. It exists from Phase 1 so that every
/// module has a compiled public surface, and so tests can assert the module graph links
/// as intended. See `Scripts/architecture.json` for the authoritative layer definitions.
public enum DesignSystemModule: Sendable {
  /// Module name, matching the target name in `Package.swift`.
  public static let name: String = "DesignSystem"

  /// Architectural layer. A module may depend only on strictly lower layers.
  public static let layer: Int = 0
}
