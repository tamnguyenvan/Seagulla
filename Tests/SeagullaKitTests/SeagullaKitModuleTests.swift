//
//  SeagullaKitModuleTests.swift
//  Seagulla
//

import XCTest

@testable import SeagullaKit

final class SeagullaKitModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(SeagullaKitModule.name, "SeagullaKit")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(SeagullaKitModule.layer, 0)
  }
}
