#!/usr/bin/env python3
"""Validate Seagulla's crate graph against scripts/architecture.json.

Cargo already prevents a crate from using a dependency it has not declared. This script
guards the layer above that: it stops someone *declaring* a dependency that violates the
architecture, and keeps the manifests, the Rust LAYER constants and this file from drifting.

Checks:
  1. Every Cargo.toml declares exactly the Seagulla dependencies the manifest specifies.
  2. Every dependency edge points to a strictly lower layer.
  3. Each crate's LAYER constant matches the manifest.

Exit status 0 when clean, 1 on violations, 2 on usage error.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

DEP_LINE = re.compile(r'^\s*(seagulla-[a-z]+)\s*=\s*\{', re.MULTILINE)
LAYER_CONST = re.compile(r"pub const LAYER:\s*u8\s*=\s*(\d+)\s*;")


def crate_path(root: Path, name: str, spec: dict) -> Path:
    return root / spec.get("path", f"crates/{name}")


def declared_dependencies(manifest: Path) -> list[str]:
    if not manifest.exists():
        return []
    return sorted(set(DEP_LINE.findall(manifest.read_text(encoding="utf-8"))))


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    manifest_path = root / "scripts" / "architecture.json"
    if not manifest_path.exists():
        print("error: run from a Seagulla checkout", file=sys.stderr)
        return 2

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    crates: dict[str, dict] = manifest["crates"]
    violations: list[str] = []

    for name, spec in crates.items():
        directory = crate_path(root, name, spec)
        expected = sorted(spec["dependencies"])

        cargo_toml = directory / "Cargo.toml"
        if not cargo_toml.exists():
            violations.append(f"{name}: no Cargo.toml at {cargo_toml.relative_to(root)}")
            continue

        actual = declared_dependencies(cargo_toml)
        if actual != expected:
            violations.append(
                f"{name}: Cargo.toml declares {actual} but architecture.json expects {expected}"
            )

        for dep in spec["dependencies"]:
            if dep not in crates:
                violations.append(f"{name} depends on unknown crate '{dep}'")
            elif crates[dep]["layer"] >= spec["layer"]:
                violations.append(
                    f"{name} (layer {spec['layer']}) depends on {dep} "
                    f"(layer {crates[dep]['layer']}) — dependencies must point strictly downward"
                )

        for source in (directory / "src" / "lib.rs", directory / "src" / "main.rs"):
            if not source.exists():
                continue
            found = LAYER_CONST.search(source.read_text(encoding="utf-8"))
            if found and int(found.group(1)) != spec["layer"]:
                violations.append(
                    f"{source.relative_to(root)}: LAYER is {found.group(1)}, "
                    f"architecture.json says {spec['layer']}"
                )

    if violations:
        print(f"Layering check FAILED — {len(violations)} violation(s):\n", file=sys.stderr)
        for violation in violations:
            print(f"  • {violation}", file=sys.stderr)
        return 1

    print(f"Layering check passed — {len(crates)} crates.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
