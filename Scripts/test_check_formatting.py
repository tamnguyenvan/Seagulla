#!/usr/bin/env python3
"""Tests for check_formatting.py — each case asserts one violation is detected."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECKER = REPO / "Scripts" / "check_formatting.py"

CLEAN = """import Foundation

/// A value.
public enum Sample: Sendable {
  public static let name: String = "Sample"

  public static func describe() -> String {
    if name.isEmpty {
      return "empty"
    }
    return name
  }
}
"""

FOUR_SPACE = """import Foundation

public enum Sample: Sendable {
    public static let name: String = "Sample"

    public static func describe() -> String {
        return name
    }
}
"""


class FormattingCheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="seagulla-format-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "Scripts").mkdir()
        shutil.copy(CHECKER, self.root / "Scripts" / "check_formatting.py")
        (self.root / ".swift-format").write_text(
            json.dumps({"lineLength": 100, "maximumBlankLines": 1}), encoding="utf-8"
        )
        self.sources = self.root / "Sources" / "Sample"
        self.sources.mkdir(parents=True)

    def write(self, contents: str) -> None:
        (self.sources / "Sample.swift").write_text(contents, encoding="utf-8")

    def run_checker(self) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(self.root / "Scripts" / "check_formatting.py")],
            capture_output=True,
            text=True,
        )

    def assertViolation(self, fragment: str) -> None:
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, f"expected failure, got:\n{result.stdout}")
        self.assertIn(fragment, result.stderr)

    def test_clean_file_passes(self) -> None:
        self.write(CLEAN)
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_detects_four_space_indentation(self) -> None:
        self.write(FOUR_SPACE)
        self.assertViolation("appears to use 4-space indentation")

    def test_detects_odd_indentation(self) -> None:
        self.write("import Foundation\n\npublic let a = 1\n   // odd\n")
        self.assertViolation("is not a multiple of 2")

    def test_detects_trailing_whitespace(self) -> None:
        self.write("import Foundation   \n")
        self.assertViolation("trailing whitespace")

    def test_detects_tab(self) -> None:
        self.write("import Foundation\n\npublic enum A {\n\tstatic let b = 1\n}\n")
        self.assertViolation("tab character")

    def test_detects_long_line(self) -> None:
        self.write("import Foundation\n\npublic let name = \"" + "x" * 120 + "\"\n")
        self.assertViolation("limit 100")

    def test_detects_unsorted_imports(self) -> None:
        self.write("import SwiftUI\nimport Foundation\n")
        self.assertViolation("not alphabetised")

    def test_detects_missing_final_newline(self) -> None:
        self.write("import Foundation")
        self.assertViolation("missing final newline")

    def test_detects_excess_blank_lines(self) -> None:
        self.write("import Foundation\n\n\n\npublic let a = 1\n")
        self.assertViolation("consecutive blank line")

    def test_multiline_string_interior_is_exempt(self) -> None:
        self.write(
            'import Foundation\n\npublic let usage = """\n'
            "   three spaces is fine inside a literal\n"
            '"""\n'
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
