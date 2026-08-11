import type { OperationKind, OperationOptions } from "../shared/types";

export function defaultOptionsFor(kind: OperationKind): OperationOptions {
  switch (kind) {
    case "convert":
      return { kind: "convert", format: "h265", preset: "2" };
    case "changeSpeed":
      return { kind: "changeSpeed", rate: 1, preservePitch: true };
    case "panCrop":
      return {
        kind: "panCrop",
        aspect: "9:16",
        direction: "ltr",
        height: 1920,
        crf: 18,
        preset: "slow",
        audioBitrate: "192k",
      };
    case "mergeMusic":
      return { kind: "mergeMusic", musicPath: "" };
    case "muteVideo":
      return { kind: "muteVideo" };
    case "extractAudio":
      return { kind: "extractAudio", bitrate: "320k", mono: false };
  }
}
