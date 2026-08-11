/**
 * Types shared across the Electron main (Node/ffmpeg) process and the
 * React renderer. Keeping these in one file is what lets the renderer
 * stay fully typed against exactly what the backend can do.
 */

export type OperationKind =
  | "convert"
  | "extractAudio"
  | "muteVideo"
  | "panCrop"
  | "mergeMusic"
  | "changeSpeed";

export interface MediaProbe {
  path: string;
  fileName: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string;
  frameRate: string;
}

/** Output video container/codec choices, ported from video_converter.py */
export const CONVERT_FORMATS = [
  { key: "h265", label: "H.265 / MP4", hint: "Best size/quality ratio, wide modern support" },
  { key: "h264", label: "H.264 / MP4", hint: "Maximum compatibility with old devices/editors" },
  { key: "vp9", label: "VP9 / WebM", hint: "Open codec, supports alpha, good for web" },
  { key: "av1", label: "AV1 / WebM", hint: "Best compression, slower to encode" },
  { key: "avif", label: "AVIF image/animation", hint: "Modern image format, supports alpha" },
  { key: "gif", label: "GIF", hint: "Legacy animated image, large files, no audio" },
] as const;
export type ConvertFormatKey = (typeof CONVERT_FORMATS)[number]["key"];

export const CONVERT_PRESETS = [
  { key: "1", label: "Ultra Compress", hint: "Smallest file, great quality" },
  { key: "2", label: "Balanced", hint: "Recommended default" },
  { key: "3", label: "High Quality", hint: "Minimal loss" },
  { key: "4", label: "Near Lossless", hint: "Largest, best quality" },
] as const;
export type ConvertPresetKey = (typeof CONVERT_PRESETS)[number]["key"];

export type PanDirection = "ltr" | "rtl";

/** Per-operation option payloads. Each mirrors one of the original scripts. */
export interface ConvertOptions {
  kind: "convert";
  format: ConvertFormatKey;
  preset: ConvertPresetKey;
}

export interface ExtractAudioOptions {
  kind: "extractAudio";
  bitrate: "96k" | "128k" | "192k" | "256k" | "320k";
  mono: boolean;
}

export interface MuteVideoOptions {
  kind: "muteVideo";
}

export interface PanCropOptions {
  kind: "panCrop";
  aspect: string; // "9:16", "4:5", "1:1", "16:9", or custom "W:H"
  direction: PanDirection;
  height: number;
  crf: number;
  preset: "ultrafast" | "fast" | "medium" | "slow" | "veryslow";
  audioBitrate: string;
}

export interface MergeMusicOptions {
  kind: "mergeMusic";
  musicPath: string;
}

/** New feature: change playback speed, pitch-preserving, by ratio input. */
export interface ChangeSpeedOptions {
  kind: "changeSpeed";
  /** Speed multiplier, e.g. 1 = unchanged, 2 = 2x faster, 0.5 = half speed */
  rate: number;
  preservePitch: boolean;
}

export type OperationOptions =
  | ConvertOptions
  | ExtractAudioOptions
  | MuteVideoOptions
  | PanCropOptions
  | MergeMusicOptions
  | ChangeSpeedOptions;

export interface JobRequest {
  id: string;
  inputPath: string;
  outputPath: string;
  options: OperationOptions;
}

export interface JobProgressEvent {
  id: string;
  percent: number; // 0-100
  stage: string;
}

export interface JobDoneEvent {
  id: string;
  ok: boolean;
  outputPath?: string;
  error?: string;
  sizeBeforeBytes?: number;
  sizeAfterBytes?: number;
}

/**
 * Contract exposed on window.api by the preload script. This is the ONLY
 * surface the renderer talks to — it never touches Node/fs/child_process
 * directly (contextIsolation + sandbox are on), and every path decision
 * (naming, collisions) is delegated to the main-process OutputResolver so
 * the renderer and main process can never disagree about where a file goes.
 */
export interface VideoForgeAPI {
  checkFfmpeg(): Promise<{ ok: boolean; message?: string }>;
  pickVideos(): Promise<string[]>;
  pickAudio(): Promise<string | null>;
  pickSaveFile(defaultPath: string, filters: { name: string; extensions: string[] }[]): Promise<string | null>;
  pickFolder(): Promise<string | null>;
  probe(path: string): Promise<MediaProbe | null>;
  suggestOutputName(inputPath: string, kind: OperationKind, overrideExt?: string): Promise<string>;
  resolveBatchOutputs(
    inputPaths: string[],
    destFolder: string,
    kind: OperationKind,
    overrideExt?: string
  ): Promise<string[]>;
  runJobs(jobs: JobRequest[]): Promise<void>;
  cancelJob(id: string): Promise<void>;
  onProgress(cb: (e: JobProgressEvent) => void): () => void;
  onDone(cb: (e: JobDoneEvent) => void): () => void;
}
