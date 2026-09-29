import { describe, expect, it } from 'vitest';
import { columnCountFor, layoutMasonry, visibleRange, type MasonryItem } from './masonry';

const options = { containerWidth: 1000, targetColumnWidth: 240, gutter: 12 };

function items(count: number, aspect = 16 / 9): MasonryItem[] {
  return Array.from({ length: count }, (_, i) => ({ id: `m-${i}`, aspect }));
}

describe('column count', () => {
  it('fits as many target-width columns as possible', () => {
    expect(columnCountFor(options)).toBe(4);
  });

  it('never drops below one column', () => {
    expect(columnCountFor({ ...options, containerWidth: 50 })).toBe(1);
    expect(columnCountFor({ ...options, containerWidth: 0 })).toBe(1);
  });

  it('respects an explicit maximum', () => {
    expect(columnCountFor({ ...options, containerWidth: 5000, maxColumns: 6 })).toBe(6);
  });
});

describe('layout', () => {
  it('fills the container width exactly', () => {
    const layout = layoutMasonry(items(20), options);
    const rightmost = Math.max(...layout.cells.map((c) => c.x + c.width));
    expect(rightmost).toBeCloseTo(options.containerWidth, 5);
  });

  it('places the first items across the columns before wrapping', () => {
    const layout = layoutMasonry(items(4), options);
    const xs = layout.cells.map((c) => c.x);
    expect(new Set(xs).size).toBe(4);
    expect(layout.cells.every((c) => c.y === 0)).toBe(true);
  });

  it('keeps columns balanced with mixed aspects', () => {
    const mixed: MasonryItem[] = Array.from({ length: 200 }, (_, i) => ({
      id: `m-${i}`,
      aspect: [16 / 9, 9 / 16, 1, 2.39][i % 4]!
    }));
    const layout = layoutMasonry(mixed, options);

    const columnBottoms = new Map<number, number>();
    for (const cell of layout.cells) {
      const bottom = cell.y + cell.height;
      columnBottoms.set(cell.x, Math.max(columnBottoms.get(cell.x) ?? 0, bottom));
    }
    const values = [...columnBottoms.values()];
    const spread = Math.max(...values) - Math.min(...values);
    // Within one tall cell of each other.
    expect(spread).toBeLessThan(layout.columnWidth / (9 / 16));
  });

  it('never overlaps two cells', () => {
    const layout = layoutMasonry(items(120, 4 / 3), options);
    const byColumn = new Map<number, typeof layout.cells>();
    for (const cell of layout.cells) {
      byColumn.set(cell.x, [...(byColumn.get(cell.x) ?? []), cell]);
    }
    for (const column of byColumn.values()) {
      const sorted = [...column].sort((a, b) => a.y - b.y);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.y).toBeGreaterThanOrEqual(sorted[i - 1]!.y + sorted[i - 1]!.height);
      }
    }
  });

  it('survives a degenerate aspect instead of producing an unrenderable cell', () => {
    const layout = layoutMasonry(
      [
        { id: 'a', aspect: 0 },
        { id: 'b', aspect: Number.NaN },
        { id: 'c', aspect: -3 }
      ],
      options
    );
    expect(layout.cells.every((c) => Number.isFinite(c.height) && c.height > 0)).toBe(true);
  });

  it('handles an empty list', () => {
    const layout = layoutMasonry([], options);
    expect(layout.cells).toEqual([]);
    expect(layout.totalHeight).toBe(0);
  });

  it('is stable — the same input yields the same layout', () => {
    const input = items(500, 1.5);
    expect(layoutMasonry(input, options)).toEqual(layoutMasonry(input, options));
  });

  it('lays out 100k items quickly enough to run on resize', () => {
    const started = performance.now();
    const layout = layoutMasonry(items(100_000), options);
    const elapsed = performance.now() - started;
    expect(layout.cells).toHaveLength(100_000);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('virtualization', () => {
  it('returns only cells near the viewport', () => {
    const layout = layoutMasonry(items(100_000), options);
    const visible = visibleRange(layout, 0, 800);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(200);
  });

  it('includes cells straddling the viewport edge', () => {
    const layout = layoutMasonry(items(400), options);
    const viewportHeight = 800;
    const visible = visibleRange(layout, 1000, viewportHeight, 0);
    expect(visible.every((c) => c.y + c.height >= 1000 && c.y <= 1800)).toBe(true);
    expect(visible.some((c) => c.y < 1000)).toBe(true);
  });

  it('returns nothing past the end', () => {
    const layout = layoutMasonry(items(20), options);
    expect(visibleRange(layout, layout.totalHeight + 5000, 800, 0)).toHaveLength(0);
  });
});
