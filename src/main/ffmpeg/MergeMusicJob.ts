import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";
import type { MergeMusicOptions } from "../../shared/types";

/** Ported 1:1 from video_music_merger.py */
export class MergeMusicJob extends FfmpegJob {
  get stageLabel() {
    return "Merging music";
  }

  protected async buildArgs() {
    const opts = this.request.options as MergeMusicOptions;
    const videoInfo = await probeMedia(this.request.inputPath);
    const audioInfo = await probeMedia(opts.musicPath);

    if (!videoInfo || !videoInfo.hasVideo) {
      throw new Error("Source does not appear to contain a video stream.");
    }
    if (!audioInfo || !audioInfo.hasAudio) {
      throw new Error("Selected music file does not appear to contain an audio stream.");
    }
    if (!videoInfo.durationSec || videoInfo.durationSec <= 0) {
      throw new Error("Could not determine video duration.");
    }

    const duration = videoInfo.durationSec;
    const args = [
      "-y",
      "-i", this.request.inputPath,
      "-i", opts.musicPath,
      "-filter_complex", "[1:a]apad[aud]",
      "-map", "0:v:0",
      "-map", "[aud]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-t", duration.toFixed(3),
      "-shortest",
      this.request.outputPath,
    ];

    return { args, totalDurationSec: duration };
  }
}
