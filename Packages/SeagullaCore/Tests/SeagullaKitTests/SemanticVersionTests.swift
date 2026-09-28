//
//  SemanticVersionTests.swift
//  Seagulla
//

import XCTest

@testable import SeagullaKit

final class SemanticVersionTests: XCTestCase {

  // MARK: - Parsing

  func testParsesWellFormedVersion() throws {
    let version = try XCTUnwrap(SemanticVersion(parsing: "1.4.12"))
    XCTAssertEqual(version.major, 1)
    XCTAssertEqual(version.minor, 4)
    XCTAssertEqual(version.patch, 12)
  }

  func testParsesZeroes() throws {
    let version = try XCTUnwrap(SemanticVersion(parsing: "0.0.0"))
    XCTAssertEqual(version, .zero)
  }

  func testParsesLeadingZeroesAsDecimal() throws {
    let version = try XCTUnwrap(SemanticVersion(parsing: "01.02.03"))
    XCTAssertEqual(version, SemanticVersion(major: 1, minor: 2, patch: 3))
  }

  func testRejectsWrongComponentCount() {
    XCTAssertNil(SemanticVersion(parsing: "1.2"))
    XCTAssertNil(SemanticVersion(parsing: "1.2.3.4"))
    XCTAssertNil(SemanticVersion(parsing: "1"))
    XCTAssertNil(SemanticVersion(parsing: ""))
  }

  func testRejectsEmptyComponents() {
    XCTAssertNil(SemanticVersion(parsing: "1..3"))
    XCTAssertNil(SemanticVersion(parsing: ".2.3"))
    XCTAssertNil(SemanticVersion(parsing: "1.2."))
  }

  func testRejectsNonNumericComponents() {
    XCTAssertNil(SemanticVersion(parsing: "1.2.3-beta"))
    XCTAssertNil(SemanticVersion(parsing: "v1.2.3"))
    XCTAssertNil(SemanticVersion(parsing: "1.x.3"))
    XCTAssertNil(SemanticVersion(parsing: "1.2.3+build"))
  }

  func testRejectsSignsAndWhitespace() {
    XCTAssertNil(SemanticVersion(parsing: "-1.2.3"))
    XCTAssertNil(SemanticVersion(parsing: "+1.2.3"))
    XCTAssertNil(SemanticVersion(parsing: " 1.2.3"))
    XCTAssertNil(SemanticVersion(parsing: "1.2.3 "))
  }

  /// `Int` accepts some non-ASCII digits, which would silently admit versions that do not
  /// round-trip through `description`. The parser must reject them.
  func testRejectsNonASCIIDigits() {
    XCTAssertNil(SemanticVersion(parsing: "١.٢.٣"))
  }

  // MARK: - Description

  func testDescriptionRoundTrips() throws {
    for text in ["0.0.0", "1.2.3", "10.20.30", "99.0.1"] {
      let version = try XCTUnwrap(SemanticVersion(parsing: text))
      XCTAssertEqual(version.description, text)
    }
  }

  // MARK: - Ordering

  func testMajorDominatesOrdering() {
    XCTAssertLessThan(
      SemanticVersion(major: 1, minor: 99, patch: 99),
      SemanticVersion(major: 2, minor: 0, patch: 0)
    )
  }

  func testMinorDominatesPatch() {
    XCTAssertLessThan(
      SemanticVersion(major: 1, minor: 2, patch: 99),
      SemanticVersion(major: 1, minor: 3, patch: 0)
    )
  }

  func testPatchOrdering() {
    XCTAssertLessThan(
      SemanticVersion(major: 1, minor: 2, patch: 3),
      SemanticVersion(major: 1, minor: 2, patch: 4)
    )
  }

  func testEqualVersionsAreNotOrdered() {
    let left = SemanticVersion(major: 1, minor: 2, patch: 3)
    let right = SemanticVersion(major: 1, minor: 2, patch: 3)
    XCTAssertEqual(left, right)
    XCTAssertFalse(left < right)
    XCTAssertFalse(right < left)
  }

  func testSortingProducesAscendingOrder() {
    let unsorted = [
      SemanticVersion(major: 2, minor: 0, patch: 0),
      SemanticVersion(major: 1, minor: 10, patch: 0),
      SemanticVersion(major: 1, minor: 2, patch: 30),
      SemanticVersion(major: 1, minor: 2, patch: 3),
    ]
    let sorted = unsorted.sorted()
    XCTAssertEqual(
      sorted.map(\.description),
      ["1.2.3", "1.2.30", "1.10.0", "2.0.0"]
    )
  }

  // MARK: - Compatibility

  func testSameMajorIsCompatible() {
    let left = SemanticVersion(major: 3, minor: 0, patch: 0)
    let right = SemanticVersion(major: 3, minor: 7, patch: 2)
    XCTAssertTrue(left.isCompatible(with: right))
    XCTAssertTrue(right.isCompatible(with: left))
  }

  func testDifferentMajorIsIncompatible() {
    let left = SemanticVersion(major: 3, minor: 9, patch: 9)
    let right = SemanticVersion(major: 4, minor: 0, patch: 0)
    XCTAssertFalse(left.isCompatible(with: right))
  }

  // MARK: - Hashing

  func testEqualVersionsHashIdentically() {
    let set: Set<SemanticVersion> = [
      SemanticVersion(major: 1, minor: 2, patch: 3),
      SemanticVersion(major: 1, minor: 2, patch: 3),
    ]
    XCTAssertEqual(set.count, 1)
  }
}
