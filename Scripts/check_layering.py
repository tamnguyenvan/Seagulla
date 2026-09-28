#!/usr/bin/env python3
"""Validate Seagulla's module graph against Scripts/architecture.json.

Swift Package Manager already prevents a target from importing a module it does not
declare. This script guards the layer above that: it stops someone from *declaring* a
dependency that violates the architecture, and it keeps Package.swift, the Xcode targets,
the Swift `layer` constants and the manifest from drifting apart.

Checks performed:
  1. Package.swift declares exactly the dependencies the manifest specifies.
  2. Every `import <SeagullaModule>` in a module's sources is a declared dependency.
  3. Every dependency edge points to a strictly lower layer.
  4. Each module's `layer` constant in Swift matches the manifest.
  5. App target sources import only their permitted modules.

Exit status is 0 when clean, 1 when violations are found, 2 on usage error.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TARGET_DECL = re.compile(r"\.(executableTarget|testTarget|target)\s*\(")
NAME_FIELD = re.compile(r"""name\s*:\s*"([^"]+)\"""")
DEPENDENCIES_FIELD = re.compile(r"dependencies\s*:\s*\[(.*?)\]", re.DOTALL)
QUOTED = re.compile(r'"([^"]+)"')
IMPORT_LINE = re.compile(r"^\s*(?:@[\w()]+\s+)*import\s+(?:struct|class|enum|func|var|let|protocol|typealias\s+)?\s*([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE)
LAYER_CONSTANT = re.compile(r"public\s+static\s+let\s+layer\s*:\s*Int\s*=\s*(\d+)")


def balanced_slice(text: str, open_index: int) -> str:
    """Return the contents between the parenthesis at `open_index` and its match."""
    depth = 0
    in_string = False
    i = open_index
    while i < len(text):
        char = text[i]
        if in_string:
            if char == "\\":
                i += 2
                continue
            if char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return text[open_index + 1 : i]
        i += 1
    raise ValueError("unbalanced parentheses in Package.swift")


def parse_package_targets(package_swift: Path) -> dict[str, list[str]]:
    """Map non-test target names to their declared Seagulla dependencies."""
    text = package_swift.read_text(encoding="utf-8")
    targets: dict[str, list[str]] = {}

    for match in TARGET_DECL.finditer(text):
        kind = match.group(1)
        if kind == "testTarget":
            continue
        body = balanced_slice(text, match.end() - 1)

        name_match = NAME_FIELD.search(body)
        if not name_match:
            continue
        name = name_match.group(1)

        deps_match = DEPENDENCIES_FIELD.search(body)
        deps = QUOTED.findall(deps_match.group(1)) if deps_match else []
        targets[name] = sorted(deps)

    return targets


def swift_imports(directory: Path, known: set[str]) -> dict[Path, set[str]]:
    """Seagulla modules imported by each Swift file under `directory`."""
    found: dict[Path, set[str]] = {}
    if not directory.is_dir():
        return found
    for path in sorted(directory.rglob("*.swift")):
        modules = {m for m in IMPORT_LINE.findall(path.read_text(encoding="utf-8")) if m in known}
        if modules:
            found[path] = modules
    return found


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    manifest_path = root / "Scripts" / "architecture.json"
    if not manifest_path.exists():
        print("error: run from a Seagulla checkout", file=sys.stderr)
        return 2

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    package_root = root / manifest.get("packageRoot", ".")
    package_path = package_root / "Package.swift"

    if not package_path.exists():
        print(f"error: no Package.swift at {package_path}", file=sys.stderr)
        return 2
    modules: dict[str, dict] = manifest["modules"]
    app_targets: dict[str, dict] = manifest["appTargets"]
    known = set(modules)
    violations: list[str] = []

    # 1. Package.swift agrees with the manifest.
    declared = parse_package_targets(package_path)
    for name, spec in modules.items():
        expected = sorted(spec["dependencies"])
        actual = declared.get(name)
        if actual is None:
            violations.append(f"Package.swift is missing target '{name}'")
        elif actual != expected:
            violations.append(
                f"{name}: Package.swift declares {actual} but architecture.json expects {expected}"
            )
    for name in sorted(set(declared) - known):
        violations.append(f"Package.swift declares target '{name}' that architecture.json omits")

    # 3. Dependency edges point strictly downward.
    for name, spec in modules.items():
        for dep in spec["dependencies"]:
            if dep not in modules:
                violations.append(f"{name} depends on unknown module '{dep}'")
                continue
            if modules[dep]["layer"] >= spec["layer"]:
                violations.append(
                    f"{name} (layer {spec['layer']}) depends on {dep} "
                    f"(layer {modules[dep]['layer']}) — dependencies must point strictly downward"
                )

    # 2 + 4. Imports are declared; Swift layer constants match the manifest.
    for name, spec in modules.items():
        source_dir = package_root / "Sources" / name
        allowed = set(spec["dependencies"])

        for path, imported in swift_imports(source_dir, known).items():
            for module in sorted(imported - allowed - {name}):
                rel = path.relative_to(root)
                violations.append(f"{rel}: imports '{module}', which {name} does not declare")

        constant_file = source_dir / f"{name}Module.swift"
        if constant_file.exists():
            found = LAYER_CONSTANT.search(constant_file.read_text(encoding="utf-8"))
            if not found:
                violations.append(f"{name}Module.swift: no 'layer' constant found")
            elif int(found.group(1)) != spec["layer"]:
                violations.append(
                    f"{name}Module.swift: layer constant is {found.group(1)}, "
                    f"architecture.json says {spec['layer']}"
                )

    # 5. App targets import only permitted modules.
    for name, spec in app_targets.items():
        allowed = set(spec["dependencies"])
        source_dir = root / spec["sourceDirectory"]
        for path, imported in swift_imports(source_dir, known).items():
            for module in sorted(imported - allowed):
                rel = path.relative_to(root)
                violations.append(f"{rel}: app target '{name}' may not import '{module}'")

    if violations:
        print(f"Layering check FAILED — {len(violations)} violation(s):\n", file=sys.stderr)
        for violation in violations:
            print(f"  • {violation}", file=sys.stderr)
        return 1

    print(f"Layering check passed — {len(modules)} modules, {len(app_targets)} app targets.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
