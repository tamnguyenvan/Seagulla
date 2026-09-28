//
//  SearchEngineModuleTests.swift
//  Seagulla
//

import XCTest

@testable import SearchEngine

final class SearchEngineModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(SearchEngineModule.name, "SearchEngine")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(SearchEngineModule.layer, 2)
  }
}
