//
//  DesignSystemModuleTests.swift
//  Seagulla
//

import XCTest

@testable import DesignSystem

final class DesignSystemModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(DesignSystemModule.name, "DesignSystem")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(DesignSystemModule.layer, 0)
  }
}
