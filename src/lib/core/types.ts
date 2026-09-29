import type { FrameRate } from './timecode';

export type VolumeStatus = 'online' | 'offline' | 'indexing';

export interface Volume {
  id: string;
  name: string;
  status: VolumeStatus;
  /** 0–1 while indexing; undefined otherwise. */
  progress?: number;
  momentCount: number;
  capacityBytes: number;
  colorIndex: number;
}

export type Codec = 'H.264' | 'HEVC' | 'ProRes' | 'R3D' | 'BRAW';

export interface Asset {
  id: string;
  volumeId: string;
  path: string;
  codec: Codec;
  width: number;
  height: number;
  fps: FrameRate;
  /** Source timecode of the first frame, as an absolute frame number. */
  startFrame: number;
  durationSeconds: number;
}

/** Why a moment matched. Shown to the user — plausible false positives are inevitable,
 *  and legible errors are forgiven where opaque ones are not. */
export type EvidenceKind = 'visual' | 'dialogue' | 'text';

export interface MatchEvidence {
  kind: EvidenceKind;
  /** The matched transcript line, visual concept, or on-screen text. */
  detail: string;
  /** 0–1. */
  confidence: number;
}

/** The unit of retrieval. A shot, not a file. */
export interface Moment {
  id: string;
  assetId: string;
  volumeId: string;
  /** Seconds from the start of the asset. */
  inSeconds: number;
  outSeconds: number;
  /** Aspect ratio, used by the masonry layout before any image loads. */
  aspect: number;
  codec: Codec;
  fps: FrameRate;
  startFrame: number;
  /** Deterministic placeholder colour, stands in for the poster frame in mock mode. */
  hue: number;
  hasDialogue: boolean;
  starred: boolean;
  /** Present only on search results. */
  score?: number;
  evidence?: MatchEvidence[];
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  query: string;
  count: number;
}

export type SearchStage = 'recall' | 'ranked';

export interface SearchBatch {
  stage: SearchStage;
  query: string;
  moments: Moment[];
  /** Server-side elapsed milliseconds, for the HUD. */
  elapsedMs: number;
}

export interface QueryChip {
  kind: 'date' | 'camera' | 'codec' | 'volume';
  label: string;
  raw: string;
}

export interface ParsedQuery {
  /** What remains after structured filters are extracted. */
  semantic: string;
  chips: QueryChip[];
}

export interface IndexProgress {
  volumeId: string;
  /** Multiple of realtime, e.g. 4.2 means 4.2× faster than playback. */
  realtimeFactor: number;
  completed: number;
  total: number;
  etaSeconds: number;
}

export interface LibraryStats {
  totalMoments: number;
  volumes: Volume[];
  spaces: Space[];
  starred: number;
  inbox: number;
}
