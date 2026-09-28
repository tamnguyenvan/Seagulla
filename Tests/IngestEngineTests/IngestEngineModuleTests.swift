//
//  IngestEngineModuleTests.swift
//  Seagulla
//

import XCTest

@testable import IngestEngine

final class IngestEngineModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(IngestEngineModule.name, "IngestEngine")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(IngestEngineModule.layer, 2)
  }
}
