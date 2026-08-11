import { spawn } from "child_process";
import { statSync } from "fs";
import path from "path";
import type { MediaProbe } from "../../shared/types";

function runFfprobeJson(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", args, { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err || `ffprobe exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out || "{}"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function checkFfmpegAvailable(): Promise<{ ok: boolean; message?: string }> {
  const check = (bin: string) =>
    new Promise<boolean>((resolve) => {
      const child = spawn(bin, ["-version"], { windowsHide: true });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    });
  const [hasFfmpeg, hasFfprobe] = await Promise.all([check("ffmpeg"), check("ffprobe")]);
  if (hasFfmpeg && hasFfprobe) return { ok: true };
  return {
    ok: false,
    message:
      "ffmpeg/ffprobe were not found on PATH. Install ffmpeg (e.g. 'brew install ffmpeg', " +
      "'sudo apt install ffmpeg', or 'winget install ffmpeg') and restart the app.",
  };
}

export async function probeMedia(filePath: string): Promise<MediaProbe | null> {
  try {
    const data = await runFfprobeJson([
      "-v", "error",
      "-show_format",
      "-show_streams",
      "-of", "json",
      filePath,
    ]);
    const streams: any[] = data.streams ?? [];
    const videoStream = streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
    const audioStream = streams.find((s) => s.codec_type === "audio");
    const format = data.format ?? {};
    const duration =
      Number(videoStream?.duration ?? format.duration ?? 0) ||
      Number(format.duration ?? 0);

    let size = Number(format.size ?? 0);
    if (!size) {
      try {
        size = statSync(filePath).size;
      } catch {
        size = 0;
      }
    }

    return {
      path: filePath,
      fileName: path.basename(filePath),
      sizeBytes: size,
      durationSec: duration,
      width: Number(videoStream?.width ?? 0),
      height: Number(videoStream?.height ?? 0),
      hasVideo: !!videoStream,
      hasAudio: !!audioStream,
      videoCodec: videoStream?.codec_name ?? "",
      frameRate: videoStream?.r_frame_rate ?? "",
    };
  } catch {
    return null;
  }
}
