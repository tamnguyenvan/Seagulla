import type { ParsedQuery, QueryChip } from './types';

/**
 * Extracts structured filters from natural language.
 *
 * Mock rules for Phase 2; the real parser replaces this in Phase 5 without changing the
 * shape. What matters now is that the UI is built against a query that *splits* — chips
 * appear, the semantic remainder shrinks — because that interaction is the hard part.
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

const CAMERAS = ['alexa', 'red', 'venice', 'komodo', 'fx3', 'fx6', 'c70', 'bmpcc'];
const CODECS = ['prores', 'braw', 'r3d', 'h264', 'hevc'];

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function parseQuery(input: string): ParsedQuery {
  const chips: QueryChip[] = [];
  const consumed = new Set<number>();
  const words = input.split(/\s+/).filter(Boolean);

  words.forEach((word, index) => {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!lower) return;

    if (MONTHS.includes(lower)) {
      chips.push({ kind: 'date', label: titleCase(lower), raw: word });
      consumed.add(index);
      // Absorb a trailing "last" or "this".
      const previous = words[index - 1]?.toLowerCase();
      if (previous === 'last' || previous === 'this' || previous === 'in') {
        consumed.add(index - 1);
      }
      return;
    }

    if (CAMERAS.includes(lower)) {
      chips.push({ kind: 'camera', label: `Camera: ${titleCase(lower)}`, raw: word });
      consumed.add(index);
      if (words[index - 1]?.toLowerCase() === 'on') consumed.add(index - 1);
      return;
    }

    if (CODECS.includes(lower)) {
      chips.push({ kind: 'codec', label: lower.toUpperCase(), raw: word });
      consumed.add(index);
    }
  });

  const semantic = words
    .filter((_, index) => !consumed.has(index))
    .join(' ')
    .trim();

  return { semantic, chips };
}
