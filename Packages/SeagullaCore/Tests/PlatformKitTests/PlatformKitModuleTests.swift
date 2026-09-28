//
//  PlatformKitModuleTests.swift
//  Seagulla
//

import XCTest

@testable import PlatformKit

final class PlatformKitModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(PlatformKitModule.name, "PlatformKit")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(PlatformKitModule.layer, 1)
  }
}
