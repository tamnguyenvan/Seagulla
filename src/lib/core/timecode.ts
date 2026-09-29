/**
 * Frame-accurate timecode.
 *
 * Drop-frame is where media applications quietly break, and everything downstream —
 * in/out points, exporters, seeking — inherits the bug. The conversion below is the
 * standard SMPTE algorithm: for 29.97 and 59.94 the *count* skips two (or four) frame
 * numbers each minute except every tenth, so that wall-clock and timecode stay aligned.
 */

export type FrameRate = 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;

/** Frame rates that use drop-frame counting. */
const DROP_FRAME_RATES = new Set<number>([29.97, 59.94]);

export function isDropFrame(fps: FrameRate): boolean {
  return DROP_FRAME_RATES.has(fps);
}

/** Nominal (integer) rate used for display, e.g. 30 for 29.97. */
export function nominalRate(fps: FrameRate): number {
  return Math.round(fps);
}

export interface TimecodeParts {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
}

/** Converts an absolute frame number to its displayed timecode parts. */
export function framesToParts(frameNumber: number, fps: FrameRate): TimecodeParts {
  if (!Number.isFinite(frameNumber) || frameNumber < 0) {
    throw new RangeError(`frameNumber must be a non-negative finite number, got ${frameNumber}`);
  }

  const nominal = nominalRate(fps);
  let n = Math.floor(frameNumber);

  if (isDropFrame(fps)) {
    const dropped = Math.round(fps * 0.066666); // 2 at 29.97, 4 at 59.94
    const framesPer10Minutes = Math.round(fps * 60 * 10);
    const framesPerMinute = nominal * 60 - dropped;
    const framesPer24Hours = Math.round(fps * 60 * 60) * 24;

    n = n % framesPer24Hours;
    const tenMinuteBlocks = Math.floor(n / framesPer10Minutes);
    const remainder = n % framesPer10Minutes;

    n += dropped * 9 * tenMinuteBlocks;
    if (remainder > dropped) {
      n += dropped * Math.floor((remainder - dropped) / framesPerMinute);
    }
  }

  return {
    frames: n % nominal,
    seconds: Math.floor(n / nominal) % 60,
    minutes: Math.floor(n / (nominal * 60)) % 60,
    hours: Math.floor(n / (nominal * 3600)) % 24
  };
}

const pad = (value: number): string => value.toString().padStart(2, '0');

/** Formats an absolute frame number as `HH:MM:SS:FF`, or `HH:MM:SS;FF` when drop-frame. */
export function formatTimecode(frameNumber: number, fps: FrameRate): string {
  const { hours, minutes, seconds, frames } = framesToParts(frameNumber, fps);
  const separator = isDropFrame(fps) ? ';' : ':';
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(frames)}`;
}

/** Converts seconds to an absolute frame number at the given rate. */
export function secondsToFrames(seconds: number, fps: FrameRate): number {
  return Math.round(seconds * fps);
}

/** Converts an absolute frame number back to seconds. */
export function framesToSeconds(frameNumber: number, fps: FrameRate): number {
  return frameNumber / fps;
}

/**
 * Formats a duration as `M:SS` or `H:MM:SS`.
 *
 * Durations read differently from positions: a four-second clip should say `0:04`,
 * not `00:00:04:00`.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
