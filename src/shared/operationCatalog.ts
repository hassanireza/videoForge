import type { OperationKind } from "./types";

export interface OperationMeta {
  kind: OperationKind;
  title: string;
  desc: string;
  /** default filename suffix, e.g. "_converted" */
  suffix: string;
  /** default output extension including the dot, or null = keep source extension */
  defaultExt: string | null;
  /** whether this op needs a second (music) file picked separately */
  needsSecondFile: boolean;
  /** whether this op supports running across multiple selected clips at once */
  supportsBatch: boolean;
}

export const OPERATIONS: OperationMeta[] = [
  {
    kind: "convert",
    title: "Convert",
    desc: "Transcode to H.265, H.264, VP9, AV1, AVIF or GIF",
    suffix: "_converted",
    defaultExt: null,
    needsSecondFile: false,
    supportsBatch: true,
  },
  {
    kind: "changeSpeed",
    title: "Speed",
    desc: "Slow down or speed up, with pitch-preserving audio",
    suffix: "_speed",
    defaultExt: ".mp4",
    needsSecondFile: false,
    supportsBatch: true,
  },
  {
    kind: "panCrop",
    title: "Pan & Crop",
    desc: "Reframe to a target aspect ratio with an animated pan",
    suffix: "_panned",
    defaultExt: ".mp4",
    needsSecondFile: false,
    supportsBatch: true,
  },
  {
    kind: "mergeMusic",
    title: "Add Music",
    desc: "Lay a music track under the video, trimmed to its length",
    suffix: "_with_music",
    defaultExt: null,
    needsSecondFile: true,
    supportsBatch: false,
  },
  {
    kind: "muteVideo",
    title: "Mute",
    desc: "Strip the audio track, no re-encode",
    suffix: "_no_audio",
    defaultExt: ".mp4",
    needsSecondFile: false,
    supportsBatch: true,
  },
  {
    kind: "extractAudio",
    title: "Extract Audio",
    desc: "Pull the highest-quality MP3 out of a video",
    suffix: "",
    defaultExt: ".mp3",
    needsSecondFile: false,
    supportsBatch: true,
  },
];

export function operationMeta(kind: OperationKind): OperationMeta {
  return OPERATIONS.find((o) => o.kind === kind)!;
}
