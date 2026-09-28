//
//  MLRuntimeModuleTests.swift
//  Seagulla
//

import XCTest

@testable import MLRuntime

final class MLRuntimeModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(MLRuntimeModule.name, "MLRuntime")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(MLRuntimeModule.layer, 1)
  }
}
