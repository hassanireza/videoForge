import { Store } from "./Store";
import type { JobRequest } from "../../shared/types";

export interface JobViewState {
  id: string;
  label: string;
  inputPath: string;
  outputPath: string;
  percent: number;
  stage: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  error?: string;
  sizeBeforeBytes?: number;
  sizeAfterBytes?: number;
}

interface QueueState {
  jobs: JobViewState[];
}

/**
 * Renderer-side mirror of the main-process JobQueueManager. It subscribes
 * to `onProgress`/`onDone` exactly once (in the constructor) regardless of
 * how many components render job cards, so there is one authoritative
 * timeline of "what happened to job X" instead of every panel keeping its
 * own listener.
 */
class JobQueueStore extends Store<QueueState> {
  constructor() {
    super({ jobs: [] });
    if (!window.api) {
      // Preload didn't attach (wrong window, stale build, or opened outside
      // Electron). Fail loud in the console instead of throwing on first
      // access — App.tsx checks window.api before ever rendering this.
      console.error("[JobQueueStore] window.api is unavailable — preload bridge did not load.");
      return;
    }
    window.api.onProgress((e) => {
      this.setState((s) => ({
        jobs: s.jobs.map((j) =>
          j.id === e.id ? { ...j, percent: e.percent, stage: e.stage, status: "running" } : j
        ),
      }));
    });
    window.api.onDone((e) => {
      this.setState((s) => ({
        jobs: s.jobs.map((j) =>
          j.id === e.id
            ? {
                ...j,
                percent: e.ok ? 100 : j.percent,
                status: e.ok ? "done" : e.error === "Cancelled" ? "cancelled" : "error",
                error: e.error,
                sizeBeforeBytes: e.sizeBeforeBytes,
                sizeAfterBytes: e.sizeAfterBytes,
                outputPath: e.outputPath ?? j.outputPath,
              }
            : j
        ),
      }));
    });
  }

  async submit(requests: (JobRequest & { label: string })[]): Promise<void> {
    const newJobs: JobViewState[] = requests.map((r) => ({
      id: r.id,
      label: r.label,
      inputPath: r.inputPath,
      outputPath: r.outputPath,
      percent: 0,
      stage: "Queued",
      status: "queued",
    }));
    this.setState((s) => ({ jobs: [...newJobs, ...s.jobs] }));
    await window.api.runJobs(requests);
  }

  cancel(id: string): void {
    window.api.cancelJob(id);
  }

  clearFinished(): void {
    this.setState((s) => ({ jobs: s.jobs.filter((j) => j.status === "queued" || j.status === "running") }));
  }
}

export const jobQueue = new JobQueueStore();
