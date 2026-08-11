import { contextBridge, ipcRenderer } from "electron";
import type {
  JobDoneEvent,
  JobProgressEvent,
  JobRequest,
  OperationKind,
  VideoForgeAPI,
} from "../shared/types";

const api: VideoForgeAPI = {
  checkFfmpeg: () => ipcRenderer.invoke("ffmpeg:check"),
  pickVideos: () => ipcRenderer.invoke("dialog:pickVideos"),
  pickAudio: () => ipcRenderer.invoke("dialog:pickAudio"),
  pickSaveFile: (defaultPath, filters) => ipcRenderer.invoke("dialog:pickSaveFile", defaultPath, filters),
  pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  probe: (path) => ipcRenderer.invoke("media:probe", path),
  suggestOutputName: (inputPath: string, kind: OperationKind, overrideExt?: string) =>
    ipcRenderer.invoke("output:suggestName", inputPath, kind, overrideExt),
  resolveBatchOutputs: (inputPaths: string[], destFolder: string, kind: OperationKind, overrideExt?: string) =>
    ipcRenderer.invoke("output:resolveBatch", inputPaths, destFolder, kind, overrideExt),
  runJobs: (jobs: JobRequest[]) => ipcRenderer.invoke("job:runMany", jobs),
  cancelJob: (id: string) => ipcRenderer.invoke("job:cancel", id),
  onProgress: (cb: (e: JobProgressEvent) => void) => {
    const listener = (_e: unknown, payload: JobProgressEvent) => cb(payload);
    ipcRenderer.on("job:progress", listener);
    return () => ipcRenderer.removeListener("job:progress", listener);
  },
  onDone: (cb: (e: JobDoneEvent) => void) => {
    const listener = (_e: unknown, payload: JobDoneEvent) => cb(payload);
    ipcRenderer.on("job:done", listener);
    return () => ipcRenderer.removeListener("job:done", listener);
  },
};

contextBridge.exposeInMainWorld("api", api);
