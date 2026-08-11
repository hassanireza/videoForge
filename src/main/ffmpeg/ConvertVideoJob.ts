import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";
import type { ConvertOptions } from "../../shared/types";

const BASE_CRF: Record<string, number> = { h265: 24, h264: 21, vp9: 32, av1: 32, avif: 28, gif: 0 };
const CRF_OFFSET: Record<string, number> = { "1": 4, "2": 0, "3": -4, "4": -8 };
const PRESET_NAME: Record<string, "slow" | "medium"> = { "1": "slow", "2": "medium", "3": "medium", "4": "slow" };
const AUDIO_BITRATE: Record<string, string> = { "1": "96k", "2": "128k", "3": "192k", "4": "256k" };

function svtav1Speed(preset: string): string {
  return preset === "slow" ? "4" : "6";
}

/** Ported 1:1 from video_converter.py's FORMATS table. */
export class ConvertVideoJob extends FfmpegJob {
  get stageLabel() {
    return "Converting";
  }

  protected async buildArgs() {
    const opts = this.request.options as ConvertOptions;
    const info = await probeMedia(this.request.inputPath);
    if (!info || !info.hasVideo) {
      throw new Error("No usable video stream found in the source file.");
    }

    const crf = opts.format === "gif" ? 0 : Math.max(0, BASE_CRF[opts.format] + CRF_OFFSET[opts.preset]);
    const preset = PRESET_NAME[opts.preset];
    const audioBitrate = AUDIO_BITRATE[opts.preset];
    const input = this.request.inputPath;
    const output = this.request.outputPath;

    let args: string[];

    switch (opts.format) {
      case "h265":
        args = [
          "-y", "-i", input,
          "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0?"] : []),
          "-c:v", "libx265", "-crf", String(crf), "-preset", preset, "-tag:v", "hvc1",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          ...(info.hasAudio ? ["-c:a", "aac", "-b:a", audioBitrate] : []),
          output,
        ];
        break;
      case "h264":
        args = [
          "-y", "-i", input,
          "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0?"] : []),
          "-c:v", "libx264", "-crf", String(crf), "-preset", preset,
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          ...(info.hasAudio ? ["-c:a", "aac", "-b:a", audioBitrate] : []),
          output,
        ];
        break;
      case "vp9":
        args = [
          "-y", "-i", input,
          "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0?"] : []),
          "-c:v", "libvpx-vp9", "-crf", String(crf), "-b:v", "0", "-row-mt", "1",
          "-pix_fmt", "yuv420p",
          ...(info.hasAudio ? ["-c:a", "libopus", "-b:a", audioBitrate] : []),
          output,
        ];
        break;
      case "av1":
        args = [
          "-y", "-i", input,
          "-map", "0:v:0", ...(info.hasAudio ? ["-map", "0:a:0?"] : []),
          "-c:v", "libsvtav1", "-crf", String(crf), "-preset", svtav1Speed(preset),
          "-pix_fmt", "yuv420p",
          ...(info.hasAudio ? ["-c:a", "libopus", "-b:a", audioBitrate] : []),
          output,
        ];
        break;
      case "avif":
        args = [
          "-y", "-i", input,
          "-map", "0:v:0",
          "-c:v", "libaom-av1", "-crf", String(crf), "-b:v", "0", "-cpu-used", "4",
          "-pix_fmt", "yuv420p",
          "-f", "avif",
          output,
        ];
        break;
      case "gif": {
        const filterComplex =
          "fps=15,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer";
        args = ["-y", "-i", input, "-filter_complex", filterComplex, output];
        break;
      }
      default:
        throw new Error(`Unsupported format: ${opts.format}`);
    }

    return { args, totalDurationSec: info.durationSec };
  }
}
