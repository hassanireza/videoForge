import React from "react";
import { clipLibrary } from "../state/ClipLibrary";
import { useClipLibrary } from "../state/hooks";
import { formatDuration } from "../format";
import { IconClose, IconPlay, IconPlus } from "../icons/Icons";

export default function ClipBin() {
  const { clips, selected } = useClipLibrary();

  const handleImport = async () => {
    const paths = await window.api.pickVideos();
    if (paths.length) await clipLibrary.addFiles(paths);
  };

  return (
    <div className="bin-panel">
      <div className="bin-header">
        <span className="bin-title">Media Bin</span>
        <span className="bin-count tabular">{clips.length}</span>
      </div>

      <div className="bin-list">
        {clips.length === 0 && (
          <div className="bin-empty">
            No clips imported yet.
            <br />
            Import one or more videos to get started.
          </div>
        )}
        {clips.map((clip) => {
          const isSelected = selected.has(clip.path);
          return (
            <div
              key={clip.path}
              className={`clip-card${isSelected ? " selected" : ""}`}
              onClick={() => clipLibrary.toggleSelected(clip.path)}
              title={clip.path}
            >
              <div className="clip-thumb">
                <IconPlay size={13} />
              </div>
              <div className="clip-info">
                <div className="clip-name">{clip.fileName}</div>
                <div className="clip-meta">
                  {clip.probe
                    ? `${formatDuration(clip.probe.durationSec)} \u00B7 ${clip.probe.width}\u00D7${clip.probe.height}${
                        clip.probe.hasAudio ? "" : " \u00B7 no audio"
                      }`
                    : clip.probing
                    ? "reading\u2026"
                    : "unreadable"}
                </div>
              </div>
              <button
                className="clip-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  clipLibrary.remove(clip.path);
                }}
                aria-label="Remove"
              >
                <IconClose size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bin-footer">
        <button className="btn" onClick={handleImport}>
          <IconPlus size={15} />
          Import video(s)
        </button>
      </div>
    </div>
  );
}
