//
//  ExportKitModuleTests.swift
//  Seagulla
//

import XCTest

@testable import ExportKit

final class ExportKitModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(ExportKitModule.name, "ExportKit")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(ExportKitModule.layer, 1)
  }
}
