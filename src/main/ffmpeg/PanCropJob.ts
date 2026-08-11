import { FfmpegJob } from "./FfmpegJob";
import { probeMedia } from "./probe";
import type { PanCropOptions } from "../../shared/types";

function even(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r - 1;
}

function parseAspect(aspect: string): number {
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) throw new Error(`Invalid aspect ratio '${aspect}'. Expected format like '9:16'.`);
  return w / h;
}

/** Ported 1:1 from pan_crop.py, including its scale->crop->pan filter math. */
export class PanCropJob extends FfmpegJob {
  get stageLabel() {
    return "Panning & cropping";
  }

  protected async buildArgs() {
    const opts = this.request.options as PanCropOptions;
    const info = await probeMedia(this.request.inputPath);
    if (!info || !info.hasVideo) {
      throw new Error("No usable video stream found in the source file.");
    }
    const duration = info.durationSec;
    if (!duration) throw new Error("Could not determine video duration.");

    const srcRatio = info.width / info.height;
    const targetRatio = parseAspect(opts.aspect);
    const targetH = even(opts.height);
    const targetW = even(targetH * targetRatio);

    let scaleExpr: string;
    let panAxis: "x" | "y";
    if (srcRatio > targetRatio) {
      scaleExpr = `scale=-2:${targetH}`;
      panAxis = "x";
    } else {
      scaleExpr = `scale=${targetW}:-2`;
      panAxis = "y";
    }

    const t = `min(t,${duration})`;
    let cropExpr: string;
    if (panAxis === "x") {
      const xExpr =
        opts.direction === "ltr" ? `(iw-ow)*(${t}/${duration})` : `(iw-ow)*(1-(${t}/${duration}))`;
      cropExpr = `crop=w=${targetW}:h=${targetH}:x='${xExpr}':y='(ih-oh)/2'`;
    } else {
      const yExpr =
        opts.direction === "ltr" ? `(ih-oh)*(${t}/${duration})` : `(ih-oh)*(1-(${t}/${duration}))`;
      cropExpr = `crop=w=${targetW}:h=${targetH}:x='(iw-ow)/2':y='${yExpr}'`;
    }

    const filterChain = `${scaleExpr},${cropExpr},setsar=1`;

    const args = [
      "-y", "-i", this.request.inputPath,
      "-vf", filterChain,
      "-c:v", "libx264",
      "-preset", opts.preset,
      "-crf", String(opts.crf),
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", opts.audioBitrate,
      "-movflags", "+faststart",
      this.request.outputPath,
    ];

    return { args, totalDurationSec: duration };
  }
}
