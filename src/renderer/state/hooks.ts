import { useSyncExternalStore } from "react";
import { clipLibrary } from "./ClipLibrary";
import { jobQueue } from "./JobQueueStore";

export function useClipLibrary() {
  return useSyncExternalStore(clipLibrary.subscribe, clipLibrary.getSnapshot);
}

export function useJobQueue() {
  return useSyncExternalStore(jobQueue.subscribe, jobQueue.getSnapshot);
}
