import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { checkFfmpegAvailable, probeMedia } from "./ffmpeg/probe";
import { JobQueueManager } from "./services/JobQueueManager";
import { OutputResolver } from "./services/OutputResolver";
import type { JobRequest, OperationKind } from "../shared/types";

const isDev = !app.isPackaged;
const queue = new JobQueueManager(2);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: "#0d0f14",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Forward queue lifecycle events to the renderer exactly once, regardless
// of how many handlers touch the queue.
queue.on("progress", (e) => mainWindow?.webContents.send("job:progress", e));
queue.on("done", (e) => mainWindow?.webContents.send("job:done", e));

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  queue.cancelAll();
  if (process.platform !== "darwin") app.quit();
});

const VIDEO_FILTERS = [
  { name: "Video files", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv", "flv", "ts", "mts"] },
  { name: "All files", extensions: ["*"] },
];
const AUDIO_FILTERS = [
  { name: "Audio files", extensions: ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma", "opus"] },
  { name: "All files", extensions: ["*"] },
];

ipcMain.handle("ffmpeg:check", async () => checkFfmpegAvailable());

ipcMain.handle("dialog:pickVideos", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Select video(s)",
    properties: ["openFile", "multiSelections"],
    filters: VIDEO_FILTERS,
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("dialog:pickAudio", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Select music/audio file",
    properties: ["openFile"],
    filters: AUDIO_FILTERS,
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
});

ipcMain.handle(
  "dialog:pickSaveFile",
  async (_e, defaultPath: string, filters: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showSaveDialog(mainWindow!, { title: "Save output as", defaultPath, filters });
    return result.canceled || !result.filePath ? null : result.filePath;
  }
);

ipcMain.handle("dialog:pickFolder", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "Choose destination folder",
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
});

ipcMain.handle("media:probe", async (_e, filePath: string) => probeMedia(filePath));

// The renderer never computes a filename itself — it asks the resolver so
// naming policy (suffix, extension, collision-avoidance) lives in one place.
ipcMain.handle(
  "output:suggestName",
  async (_e, inputPath: string, kind: OperationKind, overrideExt?: string) =>
    OutputResolver.suggestedFileName(inputPath, kind, overrideExt)
);

ipcMain.handle(
  "output:resolveBatch",
  async (_e, inputPaths: string[], destFolder: string, kind: OperationKind, overrideExt?: string) =>
    OutputResolver.resolveBatch(inputPaths, destFolder, kind, overrideExt)
);

ipcMain.handle("job:runMany", async (_e, requests: JobRequest[]) => {
  requests.forEach((r) => queue.enqueue(r));
});

ipcMain.handle("job:cancel", async (_e, id: string) => {
  queue.cancel(id);
});
