import type { VideoForgeAPI } from "../shared/types";

declare global {
  interface Window {
    api: VideoForgeAPI;
  }
}

export {};
