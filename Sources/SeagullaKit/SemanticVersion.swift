//
//  SemanticVersion.swift
//  Seagulla
//

import Foundation

/// A three-component version identifier.
///
/// Used wherever Seagulla must reason about compatibility over time: embedding model
/// versions, on-disk index versions, and the application version surfaced to Sparkle and
/// the in-app changelog. Ordering follows semantic-versioning precedence, comparing major,
/// then minor, then patch.
///
/// Pre-release and build-metadata suffixes are deliberately unsupported. Seagulla's
/// versioned artifacts are internal, and rejecting them keeps comparison total and
/// unambiguous.
public struct SemanticVersion: Sendable, Hashable, Comparable, CustomStringConvertible {
  /// Incompatible changes. A change here requires migration.
  public let major: Int

  /// Backward-compatible additions.
  public let minor: Int

  /// Backward-compatible fixes.
  public let patch: Int

  /// The lowest representable version, `0.0.0`.
  public static let zero = SemanticVersion(major: 0, minor: 0, patch: 0)

  /// Creates a version from its components.
  ///
  /// - Precondition: all components are non-negative.
  public init(major: Int, minor: Int, patch: Int) {
    precondition(
      major >= 0 && minor >= 0 && patch >= 0,
      "SemanticVersion components must be non-negative"
    )
    self.major = major
    self.minor = minor
    self.patch = patch
  }

  /// Parses a version of the form `major.minor.patch`.
  ///
  /// Returns `nil` unless the string is exactly three non-empty components of ASCII
  /// digits. Signs, whitespace, non-ASCII digits and suffixes such as `-beta` are rejected.
  public init?(parsing string: String) {
    let components = string.split(separator: ".", omittingEmptySubsequences: false)
    guard components.count == 3 else { return nil }

    var parsed: [Int] = []
    parsed.reserveCapacity(3)
    for component in components {
      guard !component.isEmpty,
        component.allSatisfy({ $0.isASCII && $0.isNumber }),
        let value = Int(component)
      else {
        return nil
      }
      parsed.append(value)
    }

    self.init(major: parsed[0], minor: parsed[1], patch: parsed[2])
  }

  /// Whether `other` may be read by code written for this version.
  ///
  /// Two versions are compatible when their major components match. Callers migrating
  /// on-disk artifacts should treat a mismatch as requiring a rebuild.
  public func isCompatible(with other: SemanticVersion) -> Bool {
    major == other.major
  }

  public var description: String {
    "\(major).\(minor).\(patch)"
  }

  public static func < (lhs: SemanticVersion, rhs: SemanticVersion) -> Bool {
    (lhs.major, lhs.minor, lhs.patch) < (rhs.major, rhs.minor, rhs.patch)
  }
}
