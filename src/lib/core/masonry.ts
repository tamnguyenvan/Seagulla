/**
 * Masonry layout with balanced columns.
 *
 * Kept pure and separate from rendering so it can be unit-tested and reused by a
 * canvas/WebGL renderer without change — the escape hatch described in
 * docs/implementation-plan.md §5.
 */

export interface MasonryItem {
  id: string;
  /** width / height */
  aspect: number;
}

export interface MasonryCell {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MasonryLayout {
  cells: MasonryCell[];
  columnCount: number;
  columnWidth: number;
  totalHeight: number;
}

export interface MasonryOptions {
  containerWidth: number;
  /** Preferred column width; actual width flexes to fill the container. */
  targetColumnWidth: number;
  gutter: number;
  minColumns?: number;
  maxColumns?: number;
}

export function columnCountFor(options: MasonryOptions): number {
  const { containerWidth, targetColumnWidth, gutter } = options;
  const min = options.minColumns ?? 1;
  const max = options.maxColumns ?? 12;
  if (containerWidth <= 0 || targetColumnWidth <= 0) return min;

  const raw = Math.floor((containerWidth + gutter) / (targetColumnWidth + gutter));
  return Math.min(max, Math.max(min, raw));
}

/** Places items into the shortest column, which keeps column heights balanced. */
export function layoutMasonry(
  items: readonly MasonryItem[],
  options: MasonryOptions
): MasonryLayout {
  const columnCount = columnCountFor(options);
  const { gutter, containerWidth } = options;
  const columnWidth = (containerWidth - gutter * (columnCount - 1)) / columnCount;

  const heights = new Array<number>(columnCount).fill(0);
  const cells: MasonryCell[] = new Array(items.length);

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;

    let column = 0;
    for (let c = 1; c < columnCount; c++) {
      if (heights[c]! < heights[column]!) column = c;
    }

    // Guard against a zero or non-finite aspect producing an unrenderable cell.
    const aspect = Number.isFinite(item.aspect) && item.aspect > 0 ? item.aspect : 16 / 9;
    const height = columnWidth / aspect;

    cells[index] = {
      id: item.id,
      index,
      x: column * (columnWidth + gutter),
      y: heights[column]!,
      width: columnWidth,
      height
    };

    heights[column] = heights[column]! + height + gutter;
  }

  const totalHeight = Math.max(0, Math.max(...heights, 0) - gutter);
  return { cells, columnCount, columnWidth, totalHeight };
}

/** Indices visible in the viewport, plus an overscan margin. */
export function visibleRange(
  layout: MasonryLayout,
  scrollTop: number,
  viewportHeight: number,
  overscanPx = 600
): MasonryCell[] {
  const top = scrollTop - overscanPx;
  const bottom = scrollTop + viewportHeight + overscanPx;
  return layout.cells.filter((cell) => cell.y + cell.height >= top && cell.y <= bottom);
}
