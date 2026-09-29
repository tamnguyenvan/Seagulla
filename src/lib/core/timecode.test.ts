import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatTimecode,
  framesToParts,
  framesToSeconds,
  isDropFrame,
  nominalRate,
  secondsToFrames,
  type FrameRate
} from './timecode';

describe('rate classification', () => {
  it('treats only 29.97 and 59.94 as drop-frame', () => {
    expect(isDropFrame(29.97)).toBe(true);
    expect(isDropFrame(59.94)).toBe(true);
    for (const fps of [23.976, 24, 25, 30, 50, 60] as FrameRate[]) {
      expect(isDropFrame(fps)).toBe(false);
    }
  });

  it('rounds to a nominal display rate', () => {
    expect(nominalRate(23.976)).toBe(24);
    expect(nominalRate(29.97)).toBe(30);
    expect(nominalRate(59.94)).toBe(60);
  });
});

describe('non-drop-frame conversion', () => {
  it('starts at zero', () => {
    expect(formatTimecode(0, 25)).toBe('00:00:00:00');
  });

  it('rolls seconds at the nominal rate', () => {
    expect(formatTimecode(24, 25)).toBe('00:00:00:24');
    expect(formatTimecode(25, 25)).toBe('00:00:01:00');
  });

  it('rolls minutes and hours', () => {
    expect(formatTimecode(25 * 60, 25)).toBe('00:01:00:00');
    expect(formatTimecode(25 * 3600, 25)).toBe('01:00:00:00');
  });

  it('uses the nominal rate for 23.976', () => {
    expect(formatTimecode(23, 23.976)).toBe('00:00:00:23');
    expect(formatTimecode(24, 23.976)).toBe('00:00:01:00');
  });
});

describe('drop-frame conversion', () => {
  // Frames 00 and 01 of each minute are skipped, except every tenth minute.
  it('skips two frame numbers at the first minute boundary', () => {
    expect(formatTimecode(1799, 29.97)).toBe('00:00:59;29');
    expect(formatTimecode(1800, 29.97)).toBe('00:01:00;02');
  });

  it('does not skip at the tenth minute', () => {
    expect(formatTimecode(17982, 29.97)).toBe('00:10:00;00');
  });

  it('keeps an hour aligned to wall clock', () => {
    expect(formatTimecode(107892, 29.97)).toBe('01:00:00;00');
  });

  it('uses a semicolon separator', () => {
    expect(formatTimecode(0, 29.97)).toContain(';');
    expect(formatTimecode(0, 30)).not.toContain(';');
  });

  it('skips four frame numbers at 59.94', () => {
    expect(formatTimecode(3600, 59.94)).toBe('00:01:00;04');
  });
});

describe('drift', () => {
  // Drop-frame exists so that timecode tracks wall-clock time. Over an hour the
  // displayed hour must land within a frame of real elapsed time.
  it('stays aligned with wall clock over an hour at 29.97', () => {
    const parts = framesToParts(107892, 29.97);
    expect(parts).toEqual({ hours: 1, minutes: 0, seconds: 0, frames: 0 });
    expect(Math.abs(framesToSeconds(107892, 29.97) - 3600)).toBeLessThan(0.5);
  });

  it('round-trips every rate through seconds without accumulating error', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
    for (const fps of rates) {
      for (const seconds of [0, 1, 59, 60, 61, 599, 600, 3599, 3600]) {
        const frames = secondsToFrames(seconds, fps);
        expect(Math.abs(framesToSeconds(frames, fps) - seconds)).toBeLessThan(0.5 / fps + 1e-9);
      }
    }
  });

  it('never produces an out-of-range component', () => {
    const rates: FrameRate[] = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
    for (const fps of rates) {
      for (let frame = 0; frame < 20000; frame += 97) {
        const p = framesToParts(frame, fps);
        expect(p.frames).toBeGreaterThanOrEqual(0);
        expect(p.frames).toBeLessThan(nominalRate(fps));
        expect(p.seconds).toBeLessThan(60);
        expect(p.minutes).toBeLessThan(60);
        expect(p.hours).toBeLessThan(24);
      }
    }
  });

  it('is monotonic', () => {
    let previous = '';
    for (let frame = 0; frame < 5000; frame++) {
      const current = formatTimecode(frame, 29.97);
      expect(current > previous || previous === '').toBe(true);
      previous = current;
    }
  });
});

describe('validation', () => {
  it('rejects negative and non-finite frame numbers', () => {
    expect(() => framesToParts(-1, 25)).toThrow(RangeError);
    expect(() => framesToParts(Number.NaN, 25)).toThrow(RangeError);
    expect(() => framesToParts(Number.POSITIVE_INFINITY, 25)).toThrow(RangeError);
  });
});

describe('duration formatting', () => {
  it('reads as a duration, not a position', () => {
    expect(formatDuration(4)).toBe('0:04');
    expect(formatDuration(64)).toBe('1:04');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('degrades safely', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});
