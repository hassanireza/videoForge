import type { JobRequest } from "../../shared/types";
import { FfmpegJob } from "./FfmpegJob";
import { ConvertVideoJob } from "./ConvertVideoJob";
import { ExtractAudioJob } from "./ExtractAudioJob";
import { MuteVideoJob } from "./MuteVideoJob";
import { PanCropJob } from "./PanCropJob";
import { MergeMusicJob } from "./MergeMusicJob";
import { ChangeSpeedJob } from "./ChangeSpeedJob";

export function createJob(request: JobRequest): FfmpegJob {
  switch (request.options.kind) {
    case "convert":
      return new ConvertVideoJob(request);
    case "extractAudio":
      return new ExtractAudioJob(request);
    case "muteVideo":
      return new MuteVideoJob(request);
    case "panCrop":
      return new PanCropJob(request);
    case "mergeMusic":
      return new MergeMusicJob(request);
    case "changeSpeed":
      return new ChangeSpeedJob(request);
    default: {
      const exhaustive: never = request.options;
      throw new Error(`Unknown operation: ${JSON.stringify(exhaustive)}`);
    }
  }
}
