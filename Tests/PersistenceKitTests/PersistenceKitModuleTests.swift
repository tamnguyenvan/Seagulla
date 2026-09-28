//
//  PersistenceKitModuleTests.swift
//  Seagulla
//

import XCTest

@testable import PersistenceKit

final class PersistenceKitModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(PersistenceKitModule.name, "PersistenceKit")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(PersistenceKitModule.layer, 1)
  }
}
