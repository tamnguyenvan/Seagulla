#!/usr/bin/env python3
"""Tests for check_layering.py.

A layering check that cannot fail provides no protection, so each test introduces one
specific violation into a synthetic checkout and asserts the checker reports it.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECKER = REPO / "Scripts" / "check_layering.py"

MANIFEST = {
    "layers": [
        {"index": 0, "name": "foundation", "description": ""},
        {"index": 1, "name": "capability", "description": ""},
        {"index": 2, "name": "engine", "description": ""},
    ],
    "modules": {
        "Core": {"layer": 0, "dependencies": []},
        "Store": {"layer": 1, "dependencies": ["Core"]},
        "Engine": {"layer": 2, "dependencies": ["Core", "Store"]},
    },
    "appTargets": {"App": {"sourceDirectory": "App", "dependencies": ["Core"]}},
}

PACKAGE = """// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "Fixture",
  targets: [
    .target(name: "Core"),
    .target(name: "Store", dependencies: ["Core"]),
    .target(name: "Engine", dependencies: ["Core", "Store"]),
    .testTarget(name: "CoreTests", dependencies: ["Core"]),
  ]
)
"""


def module_source(name: str, layer: int, imports: list[str] | None = None) -> str:
    lines = ["import Foundation"]
    lines += [f"import {module}" for module in (imports or [])]
    lines += [
        "",
        f"public enum {name}Module: Sendable {{",
        f'  public static let name: String = "{name}"',
        f"  public static let layer: Int = {layer}",
        "}",
        "",
    ]
    return "\n".join(lines)


class LayeringCheckTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="seagulla-layering-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)

        (self.root / "Scripts").mkdir()
        shutil.copy(CHECKER, self.root / "Scripts" / "check_layering.py")
        self.write_manifest(MANIFEST)
        (self.root / "Package.swift").write_text(PACKAGE, encoding="utf-8")

        for name, spec in MANIFEST["modules"].items():
            directory = self.root / "Sources" / name
            directory.mkdir(parents=True)
            (directory / f"{name}Module.swift").write_text(
                module_source(name, spec["layer"], spec["dependencies"]), encoding="utf-8"
            )

        app = self.root / "App"
        app.mkdir()
        (app / "AppMain.swift").write_text("import Core\n", encoding="utf-8")

    def write_manifest(self, manifest: dict) -> None:
        (self.root / "Scripts" / "architecture.json").write_text(
            json.dumps(manifest, indent=2), encoding="utf-8"
        )

    def run_checker(self) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(self.root / "Scripts" / "check_layering.py")],
            capture_output=True,
            text=True,
        )

    def assertViolation(self, fragment: str) -> None:
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, f"expected failure, got:\n{result.stdout}")
        self.assertIn(fragment, result.stderr)

    # MARK: - Cases

    def test_clean_checkout_passes(self) -> None:
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Layering check passed", result.stdout)

    def test_detects_undeclared_import(self) -> None:
        # Store imports Engine, which it does not declare and which sits above it.
        path = self.root / "Sources" / "Store" / "StoreModule.swift"
        path.write_text(module_source("Store", 1, ["Core", "Engine"]), encoding="utf-8")
        self.assertViolation("imports 'Engine', which Store does not declare")

    def test_detects_package_manifest_mismatch(self) -> None:
        package = PACKAGE.replace(
            '.target(name: "Store", dependencies: ["Core"]),', '.target(name: "Store"),'
        )
        (self.root / "Package.swift").write_text(package, encoding="utf-8")
        self.assertViolation("Package.swift declares []")

    def test_detects_upward_dependency(self) -> None:
        manifest = json.loads(json.dumps(MANIFEST))
        manifest["modules"]["Core"]["dependencies"] = ["Store"]
        self.write_manifest(manifest)
        self.assertViolation("dependencies must point strictly downward")

    def test_detects_layer_constant_drift(self) -> None:
        path = self.root / "Sources" / "Store" / "StoreModule.swift"
        path.write_text(module_source("Store", 2, ["Core"]), encoding="utf-8")
        self.assertViolation("layer constant is 2")

    def test_detects_forbidden_app_target_import(self) -> None:
        (self.root / "App" / "AppMain.swift").write_text(
            "import Core\nimport Engine\n", encoding="utf-8"
        )
        self.assertViolation("app target 'App' may not import 'Engine'")

    def test_detects_target_missing_from_package(self) -> None:
        package = PACKAGE.replace('    .target(name: "Engine", dependencies: ["Core", "Store"]),\n', "")
        (self.root / "Package.swift").write_text(package, encoding="utf-8")
        self.assertViolation("missing target 'Engine'")


if __name__ == "__main__":
    unittest.main(verbosity=2)
