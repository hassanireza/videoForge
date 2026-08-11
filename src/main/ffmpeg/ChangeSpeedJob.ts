import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";
import type { ChangeSpeedOptions } from "../../shared/types";

/**
 * ffmpeg's `atempo` filter only accepts values in [0.5, 2.0]. To support
 * arbitrary rates (e.g. 0.1x or 8x, or "10%"/"800%" typed by the user) we
 * chain multiple atempo stages, each within the valid range, so the
 * combined effect multiplies out to the requested rate while keeping pitch
 * natural (no chipmunk/demon voice) — the same trick ffmpeg's own docs
 * recommend for going outside 0.5–2.0.
 */
function buildAtempoChain(rate: number): string {
  if (rate <= 0) throw new Error("Speed rate must be greater than 0.");
  const stages: number[] = [];
  let remaining = rate;
  const MIN = 0.5;
  const MAX = 2.0;
  while (remaining < MIN || remaining > MAX) {
    if (remaining > MAX) {
      stages.push(MAX);
      remaining /= MAX;
    } else {
      stages.push(MIN);
      remaining /= MIN;
    }
  }
  stages.push(remaining);
  return stages.map((s) => `atempo=${s.toFixed(6)}`).join(",");
}

/** New feature: change playback speed (video via setpts, audio via atempo chain). */
export class ChangeSpeedJob extends FfmpegJob {
  get stageLabel() {
    return "Changing speed";
  }

  protected async buildArgs() {
    const opts = this.request.options as ChangeSpeedOptions;
    const info = await probeMedia(this.request.inputPath);
    if (!info || !info.hasVideo) {
      throw new Error("No usable video stream found in the source file.");
    }
    if (!opts.rate || opts.rate <= 0) {
      throw new Error("Speed rate must be a positive number (e.g. 2 for 2x, 0.5 for half speed).");
    }

    // Video: setpts scales the *presentation timestamps* — dividing by rate
    // speeds the video up, multiplying slows it down, so we use 1/rate.
    const ptsFactor = 1 / opts.rate;
    const videoFilter = `setpts=${ptsFactor.toFixed(6)}*PTS`;

    let filterComplex: string;
    let mapArgs: string[];

    if (info.hasAudio && opts.preservePitch) {
      const audioFilter = buildAtempoChain(opts.rate);
      filterComplex = `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`;
      mapArgs = ["-map", "[v]", "-map", "[a]"];
    } else if (info.hasAudio && !opts.preservePitch) {
      // Not pitch-preserving: resample audio directly by the rate (changes pitch,
      // like a tape speed change) using asetrate + aresample back to a standard rate.
      filterComplex = `[0:v]${videoFilter}[v];[0:a]asetrate=44100*${opts.rate.toFixed(6)},aresample=44100[a]`;
      mapArgs = ["-map", "[v]", "-map", "[a]"];
    } else {
      filterComplex = `[0:v]${videoFilter}[v]`;
      mapArgs = ["-map", "[v]"];
    }

    const outputDuration = info.durationSec / opts.rate;

    const args = [
      "-y", "-i", this.request.inputPath,
      "-filter_complex", filterComplex,
      ...mapArgs,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      ...(info.hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : []),
      "-movflags", "+faststart",
      this.request.outputPath,
    ];

    return { args, totalDurationSec: outputDuration };
  }
}
