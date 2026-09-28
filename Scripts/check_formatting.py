#!/usr/bin/env python3
"""Toolchain-free pre-flight for the swift-format rules that can be checked textually.

swift-format is the authority, but it needs an Xcode toolchain. This script covers the
subset that is purely textual, so formatting drift is caught on any machine and in the
cheap Linux CI job rather than after a macOS runner has spun up.

Checks: line length, trailing whitespace, tabs, final newline, consecutive blank lines,
two-space indentation, and alphabetically ordered import groups. Lines inside multi-line
string literals are exempt from indentation and length rules.

Exit status is 0 when clean, 1 when violations are found.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SOURCE_DIRECTORIES = ("Sources", "Tests", "Seagulla", "Gallery")


def configured_line_length(root: Path) -> int:
    config = root / ".swift-format"
    if config.exists():
        return int(json.loads(config.read_text(encoding="utf-8")).get("lineLength", 100))
    return 100


def max_blank_lines(root: Path) -> int:
    config = root / ".swift-format"
    if config.exists():
        return int(json.loads(config.read_text(encoding="utf-8")).get("maximumBlankLines", 1))
    return 1


def check_file(path: Path, rel: Path, line_length: int, blank_limit: int) -> list[str]:
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")

    if text and not text.endswith("\n"):
        problems.append(f"{rel}: missing final newline")
    if text.endswith("\n\n"):
        problems.append(f"{rel}: trailing blank line at end of file")

    lines = text.splitlines()
    in_multiline_string = False
    blank_run = 0
    imports: list[tuple[int, str]] = []
    indents: set[int] = set()

    for number, line in enumerate(lines, 1):
        # Track multi-line string literals; their interior is exempt.
        if line.count('"""') % 2 == 1:
            in_multiline_string = not in_multiline_string
            continue

        if line.strip():
            blank_run = 0
        else:
            blank_run += 1
            if blank_run > blank_limit:
                problems.append(f"{rel}:{number}: more than {blank_limit} consecutive blank line(s)")

        if "\t" in line:
            problems.append(f"{rel}:{number}: tab character")
        if line != line.rstrip():
            problems.append(f"{rel}:{number}: trailing whitespace")

        if in_multiline_string:
            continue

        if len(line) > line_length:
            problems.append(f"{rel}:{number}: line is {len(line)} characters (limit {line_length})")

        indent = len(line) - len(line.lstrip(" "))
        if line.strip():
            indents.add(indent)
            if indent % 2 != 0:
                problems.append(f"{rel}:{number}: indent of {indent} is not a multiple of 2")

        # Collect contiguous import groups and verify each is sorted.
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("@testable import "):
            module = stripped.split("import ", 1)[1].strip()
            imports.append((number, module))
        elif imports:
            problems.extend(unsorted_group(rel, imports))
            imports = []

    if imports:
        problems.extend(unsorted_group(rel, imports))

    # A file that nests to four spaces without ever using two is four-space indented.
    # This is the Xcode template default and the most common way formatting drifts.
    if 4 in indents and 2 not in indents:
        problems.append(
            f"{rel}: appears to use 4-space indentation; the project uses 2"
        )

    return problems


def unsorted_group(rel: Path, group: list[tuple[int, str]]) -> list[str]:
    names = [name for _, name in group]
    if names == sorted(names):
        return []
    return [f"{rel}:{group[0][0]}: import group is not alphabetised — expected {sorted(names)}"]


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    line_length = configured_line_length(root)
    blank_limit = max_blank_lines(root)

    problems: list[str] = []
    count = 0
    for directory in SOURCE_DIRECTORIES:
        base = root / directory
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.swift")):
            count += 1
            problems.extend(check_file(path, path.relative_to(root), line_length, blank_limit))

    if problems:
        print(f"Formatting pre-flight FAILED — {len(problems)} issue(s):\n", file=sys.stderr)
        for problem in problems:
            print(f"  • {problem}", file=sys.stderr)
        print("\nRun `make format` to fix.", file=sys.stderr)
        return 1

    print(f"Formatting pre-flight passed — {count} Swift files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
