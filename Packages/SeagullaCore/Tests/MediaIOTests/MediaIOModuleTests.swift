//
//  MediaIOModuleTests.swift
//  Seagulla
//

import XCTest

@testable import MediaIO

final class MediaIOModuleTests: XCTestCase {
  func testModuleNameMatchesTargetName() {
    XCTAssertEqual(MediaIOModule.name, "MediaIO")
  }

  func testModuleDeclaresExpectedLayer() {
    XCTAssertEqual(MediaIOModule.layer, 1)
  }
}
