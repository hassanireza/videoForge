import { EventEmitter } from "events";
import type { JobDoneEvent, JobProgressEvent, JobRequest } from "../../shared/types";
import { createJob } from "../ffmpeg/JobFactory";
import type { FfmpegJob } from "../ffmpeg/FfmpegJob";
import { OutputResolver } from "./OutputResolver";

interface QueueEvents {
  progress: (e: JobProgressEvent) => void;
  done: (e: JobDoneEvent) => void;
}

/**
 * Every operation (convert, mute, pan/crop, merge music, extract audio,
 * speed) previously ran however `ipcMain.handle("job:run", ...)` happened
 * to invoke it — no shared concurrency limit, no shared cancellation
 * bookkeeping, no shared validation. That doesn't scale once a user selects
 * 20 clips and hits "Run": spawning 20 ffmpeg processes at once would choke
 * most machines.
 *
 * JobQueueManager is the single owner of "what is running right now." It
 * caps concurrency, validates every request through OutputResolver before
 * touching ffmpeg, and is the one place that emits progress/done events —
 * main.ts just forwards them to the renderer.
 */
export class JobQueueManager extends EventEmitter {
  private readonly maxConcurrent: number;
  private readonly pending: JobRequest[] = [];
  private readonly active = new Map<string, FfmpegJob>();

  constructor(maxConcurrent = 2) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  on<K extends keyof QueueEvents>(event: K, listener: QueueEvents[K]): this {
    return super.on(event, listener as (...args: any[]) => void);
  }
  emit<K extends keyof QueueEvents>(event: K, ...args: Parameters<QueueEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  enqueue(request: JobRequest): void {
    const validationError = OutputResolver.validate(request.inputPath, request.outputPath);
    if (validationError) {
      this.emit("done", { id: request.id, ok: false, error: validationError });
      return;
    }
    this.pending.push(request);
    this.pump();
  }

  cancel(id: string): void {
    this.active.get(id)?.cancel();
    const idx = this.pending.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.pending.splice(idx, 1);
      this.emit("done", { id, ok: false, error: "Cancelled" });
    }
  }

  cancelAll(): void {
    this.pending.splice(0, this.pending.length);
    this.active.forEach((job) => job.cancel());
  }

  get runningCount(): number {
    return this.active.size;
  }

  private pump(): void {
    while (this.active.size < this.maxConcurrent && this.pending.length > 0) {
      const request = this.pending.shift()!;
      this.start(request);
    }
  }

  private start(request: JobRequest): void {
    const job = createJob(request);
    this.active.set(request.id, job);

    job
      .run((percent, stage) => {
        this.emit("progress", { id: request.id, percent, stage });
      })
      .then((result) => {
        this.active.delete(request.id);
        this.emit("done", {
          id: request.id,
          ok: result.ok,
          outputPath: result.outputPath,
          error: result.error,
          sizeBeforeBytes: result.sizeBeforeBytes,
          sizeAfterBytes: result.sizeAfterBytes,
        });
        this.pump();
      });
  }
}
