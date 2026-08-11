import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";
import type { ExtractAudioOptions } from "../../shared/types";

const SUPPORTED_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

function nearestSupportedRate(rate: number): number {
  return SUPPORTED_RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best));
}

/** Ported 1:1 from extract_audio.py */
export class ExtractAudioJob extends FfmpegJob {
  get stageLabel() {
    return "Extracting audio";
  }

  protected async buildArgs() {
    const opts = this.request.options as ExtractAudioOptions;
    const info = await probeMedia(this.request.inputPath);
    if (!info || !info.hasAudio) {
      throw new Error("No audio stream found in the source file.");
    }

    // ffprobe stream-level sample rate isn't in MediaProbe; default to 44100
    // like the script does when it can't read one, then snap to a legal rate.
    const sampleRate = nearestSupportedRate(44100);

    const args = [
      "-y", "-i", this.request.inputPath,
      "-vn",
      "-map", "0:a:0",
      "-c:a", "libmp3lame",
      "-b:a", opts.bitrate,
      "-ar", String(sampleRate),
      "-map_metadata", "0",
      "-id3v2_version", "3",
      "-ac", opts.mono ? "1" : "2",
      this.request.outputPath,
    ];

    return { args, totalDurationSec: info.durationSec };
  }
}
