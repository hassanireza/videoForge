import React from "react";
import type { OperationKind } from "../shared/types";
import { IconConvert, IconSpeed, IconCrop, IconMusicAdd, IconMute, IconWaveform } from "./icons/Icons";

export function operationIcon(kind: OperationKind, size = 17): React.ReactElement {
  switch (kind) {
    case "convert":
      return <IconConvert size={size} />;
    case "changeSpeed":
      return <IconSpeed size={size} />;
    case "panCrop":
      return <IconCrop size={size} />;
    case "mergeMusic":
      return <IconMusicAdd size={size} />;
    case "muteVideo":
      return <IconMute size={size} />;
    case "extractAudio":
      return <IconWaveform size={size} />;
  }
}
