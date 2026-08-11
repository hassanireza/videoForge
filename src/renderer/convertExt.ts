import type { ConvertFormatKey } from "../shared/types";

export function extForConvertFormat(format: ConvertFormatKey): string {
  switch (format) {
    case "h265":
    case "h264":
      return ".mp4";
    case "vp9":
    case "av1":
      return ".webm";
    case "avif":
      return ".avif";
    case "gif":
      return ".gif";
  }
}
