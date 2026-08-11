import { spawn } from "child_process";
import { existsSync, statSync } from "fs";
import type { JobRequest } from "../../shared/types";

export type ProgressCallback = (percent: number, stage: string) => void;

export interface JobResult {
  ok: boolean;
  outputPath?: string;
  error?: string;
  sizeBeforeBytes?: number;
  sizeAfterBytes?: number;
}

/**
 * Abstract base for every ffmpeg-backed operation. Each concrete operation
 * (ConvertVideoJob, ExtractAudioJob, MuteVideoJob, PanCropJob, MergeMusicJob,
 * ChangeSpeedJob) only has to implement `buildCommand()` — everything about
 * spawning ffmpeg, parsing `-progress pipe:1` output, and error handling
 * lives here once.
 */
export abstract class FfmpegJob {
  protected readonly request: JobRequest;
  private killed = false;
  private child: ReturnType<typeof spawn> | null = null;

  constructor(request: JobRequest) {
    this.request = request;
  }

  /** Human label shown in the UI while this job runs. */
  abstract get stageLabel(): string;

  /**
   * Build the full ffmpeg argv (excluding the leading "ffmpeg" binary name)
   * and report the expected total duration (seconds) used for % progress.
   * Implementations should NOT include "-progress"/"-nostats" — the base
   * class appends those automatically.
   */
  protected abstract buildArgs(): Promise<{ args: string[]; totalDurationSec: number }>;

  cancel(): void {
    this.killed = true;
    this.child?.kill("SIGKILL");
  }

  async run(onProgress: ProgressCallback): Promise<JobResult> {
    const sizeBefore = existsSync(this.request.inputPath)
      ? statSync(this.request.inputPath).size
      : undefined;

    let built: { args: string[]; totalDurationSec: number };
    try {
      built = await this.buildArgs();
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }

    const args = [...built.args, "-progress", "pipe:1", "-nostats"];

    return new Promise<JobResult>((resolve) => {
      const child = spawn("ffmpeg", args, { windowsHide: true });
      this.child = child;

      let stderrTail = "";
      child.stderr?.on("data", (chunk) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-4000);
      });

      let buffer = "";
      child.stdout?.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith("out_time_ms=")) {
            const us = Number(line.split("=")[1]);
            if (!Number.isNaN(us) && built.totalDurationSec > 0) {
              const seconds = us / 1_000_000;
              const pct = Math.max(0, Math.min(100, (seconds / built.totalDurationSec) * 100));
              onProgress(pct, this.stageLabel);
            }
          } else if (line === "progress=end") {
            onProgress(100, this.stageLabel);
          }
        }
      });

      child.on("error", (err) => {
        resolve({ ok: false, error: `Failed to launch ffmpeg: ${err.message}. Is ffmpeg installed and on PATH?` });
      });

      child.on("close", (code) => {
        if (this.killed) {
          resolve({ ok: false, error: "Cancelled" });
          return;
        }
        if (code === 0 && existsSync(this.request.outputPath)) {
          const sizeAfter = statSync(this.request.outputPath).size;
          resolve({
            ok: true,
            outputPath: this.request.outputPath,
            sizeBeforeBytes: sizeBefore,
            sizeAfterBytes: sizeAfter,
          });
        } else {
          const lastLine = stderrTail.trim().split("\n").slice(-4).join("\n");
          resolve({ ok: false, error: lastLine || `ffmpeg exited with code ${code}`, sizeBeforeBytes: sizeBefore });
        }
      });
    });
  }
}
