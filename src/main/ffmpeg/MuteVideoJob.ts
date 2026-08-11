import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";

/** Ported 1:1 from mute_video.py */
export class MuteVideoJob extends FfmpegJob {
  get stageLabel() {
    return "Removing audio";
  }

  protected async buildArgs() {
    const info = await probeMedia(this.request.inputPath);
    if (!info || !info.hasVideo) {
      throw new Error("No usable video stream found in the source file.");
    }

    const args = [
      "-y", "-i", this.request.inputPath,
      "-map", "0:v:0",
      "-c:v", "copy",
      "-an",
      "-movflags", "+faststart",
      this.request.outputPath,
    ];

    return { args, totalDurationSec: info.durationSec };
  }
}
