#!/usr/bin/env python3
"""Tests for check_layering.py — each case asserts one violation class is detected."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECKER = REPO / "scripts" / "check_layering.py"

MANIFEST = {
    "layers": [{"index": i, "name": n, "description": ""} for i, n in enumerate(["a", "b", "c"])],
    "crates": {
        "seagulla-core": {"layer": 0, "dependencies": []},
        "seagulla-db": {"layer": 1, "dependencies": ["seagulla-core"]},
        "seagulla-ingest": {"layer": 2, "dependencies": ["seagulla-core", "seagulla-db"]},
    },
}


def cargo_toml(name: str, deps: list[str]) -> str:
    lines = [f'[package]\nname = "{name}"\n\n[dependencies]']
    lines += [f'{d} = {{ path = "../{d}" }}' for d in deps]
    return "\n".join(lines) + "\n"


def lib_rs(layer: int) -> str:
    return f'pub const NAME: &str = "x";\npub const LAYER: u8 = {layer};\n'


class LayeringTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="seagulla-layer-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        (self.root / "scripts").mkdir()
        shutil.copy(CHECKER, self.root / "scripts" / "check_layering.py")
        self.write_manifest(MANIFEST)
        for name, spec in MANIFEST["crates"].items():
            d = self.root / "crates" / name / "src"
            d.mkdir(parents=True)
            (d.parent / "Cargo.toml").write_text(cargo_toml(name, spec["dependencies"]))
            (d / "lib.rs").write_text(lib_rs(spec["layer"]))

    def write_manifest(self, manifest: dict) -> None:
        (self.root / "scripts" / "architecture.json").write_text(json.dumps(manifest, indent=2))

    def run_checker(self) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(self.root / "scripts" / "check_layering.py")],
            capture_output=True, text=True,
        )

    def assertViolation(self, fragment: str) -> None:
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, f"expected failure, got:\n{result.stdout}")
        self.assertIn(fragment, result.stderr)

    def test_clean_passes(self) -> None:
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_detects_undeclared_dependency(self) -> None:
        (self.root / "crates" / "seagulla-db" / "Cargo.toml").write_text(
            cargo_toml("seagulla-db", [])
        )
        self.assertViolation("Cargo.toml declares []")

    def test_detects_extra_dependency(self) -> None:
        (self.root / "crates" / "seagulla-core" / "Cargo.toml").write_text(
            cargo_toml("seagulla-core", ["seagulla-db"])
        )
        self.assertViolation("seagulla-core")

    def test_detects_upward_dependency(self) -> None:
        manifest = json.loads(json.dumps(MANIFEST))
        manifest["crates"]["seagulla-core"]["dependencies"] = ["seagulla-db"]
        self.write_manifest(manifest)
        (self.root / "crates" / "seagulla-core" / "Cargo.toml").write_text(
            cargo_toml("seagulla-core", ["seagulla-db"])
        )
        self.assertViolation("must point strictly downward")

    def test_detects_layer_constant_drift(self) -> None:
        (self.root / "crates" / "seagulla-db" / "src" / "lib.rs").write_text(lib_rs(2))
        self.assertViolation("LAYER is 2")

    def test_detects_missing_manifest(self) -> None:
        (self.root / "crates" / "seagulla-db" / "Cargo.toml").unlink()
        self.assertViolation("no Cargo.toml")


if __name__ == "__main__":
    unittest.main(verbosity=2)
