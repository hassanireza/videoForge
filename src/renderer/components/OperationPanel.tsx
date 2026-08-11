import React, { useMemo, useState } from "react";
import { useClipLibrary } from "../state/hooks";
import { jobQueue } from "../state/JobQueueStore";
import { OPERATIONS, operationMeta } from "../../shared/operationCatalog";
import { defaultOptionsFor } from "../defaultOptions";
import { extForConvertFormat } from "../convertExt";
import { stripExt } from "../format";
import { operationIcon } from "../operationIcons";
import { IconFolder } from "../icons/Icons";
import type {
  ChangeSpeedOptions,
  ConvertFormatKey,
  ConvertOptions,
  ConvertPresetKey,
  ExtractAudioOptions,
  JobRequest,
  MergeMusicOptions,
  OperationKind,
  OperationOptions,
  PanCropOptions,
} from "../../shared/types";
import { CONVERT_FORMATS, CONVERT_PRESETS } from "../../shared/types";

const SPEED_PRESETS = [25, 50, 75, 100, 150, 200, 400];
const ASPECT_PRESETS = ["9:16", "4:5", "1:1", "16:9"];

function newJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function OperationPanel() {
  const { clips, selected } = useClipLibrary();
  const selectedClips = useMemo(() => clips.filter((c) => selected.has(c.path)), [clips, selected]);

  // `kind` and `options` used to be two separate useState calls kept in sync
  // via a useEffect keyed on `kind`. That created a one-render race: after
  // clicking a different operation card, React commits the new `kind`
  // immediately, but the effect that resets `options` to match only runs
  // *after* that render — so for one frame, a form for the new kind (e.g.
  // SpeedForm) would receive options still shaped for the old kind (e.g.
  // ConvertOptions, which has no `.rate`), crashing on `.rate.toFixed(...)`.
  // Folding both into one state object makes kind/options change atomically
  // in a single setState, so they can never disagree.
  const [config, setConfig] = useState<OperationOptions>(defaultOptionsFor("convert"));
  const kind = config.kind;
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function selectOperation(next: OperationKind) {
    setConfig(defaultOptionsFor(next));
    setNotice(null);
  }

  const options = config;
  const setOptions = setConfig;

  const meta = operationMeta(kind);
  const batchMode = selectedClips.length > 1;
  const canRun =
    selectedClips.length > 0 &&
    (!batchMode || meta.supportsBatch) &&
    (kind !== "mergeMusic" || (options as MergeMusicOptions).musicPath);

  const overrideExt = kind === "convert" ? extForConvertFormat((options as ConvertOptions).format) : undefined;

  async function handleRun() {
    setNotice(null);
    if (selectedClips.length === 0) return;

    try {
      setRunning(true);
      const requests: (JobRequest & { label: string })[] = [];

      if (selectedClips.length === 1) {
        const clip = selectedClips[0];
        const suggested = await window.api.suggestOutputName(clip.path, kind, overrideExt);
        const ext = suggested.slice(suggested.lastIndexOf("."));
        const savePath = await window.api.pickSaveFile(suggested, [
          { name: ext.replace(".", "").toUpperCase(), extensions: [ext.replace(".", "")] },
        ]);
        if (!savePath) {
          setRunning(false);
          return;
        }
        requests.push({
          id: newJobId(),
          inputPath: clip.path,
          outputPath: savePath,
          options,
          label: `${stripExt(clip.fileName)} \u2192 ${meta.title}`,
        });
      } else {
        const folder = await window.api.pickFolder();
        if (!folder) {
          setRunning(false);
          return;
        }
        const inputs = selectedClips.map((c) => c.path);
        const outputs = await window.api.resolveBatchOutputs(inputs, folder, kind, overrideExt);
        selectedClips.forEach((clip, i) => {
          requests.push({
            id: newJobId(),
            inputPath: clip.path,
            outputPath: outputs[i],
            options,
            label: `${stripExt(clip.fileName)} \u2192 ${meta.title}`,
          });
        });
      }

      await jobQueue.submit(requests);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="op-panel">
      <div className="op-scroll">
        <h3 className="section-label">Operation</h3>
        <div className="op-grid">
          {OPERATIONS.map((op) => (
            <button
              key={op.kind}
              className={`op-card${kind === op.kind ? " active" : ""}`}
              onClick={() => selectOperation(op.kind)}
            >
              <span className="op-card-icon">{operationIcon(op.kind)}</span>
              <span className="op-card-title">{op.title}</span>
              <span className="op-card-desc">{op.desc}</span>
            </button>
          ))}
        </div>

        <h3 className="section-label">Settings</h3>
        <div className="config-card">
          {kind === "convert" && (
            <ConvertForm value={options as ConvertOptions} onChange={setOptions} />
          )}
          {kind === "changeSpeed" && (
            <SpeedForm value={options as ChangeSpeedOptions} onChange={setOptions} />
          )}
          {kind === "panCrop" && <PanCropForm value={options as PanCropOptions} onChange={setOptions} />}
          {kind === "mergeMusic" && (
            <MergeMusicForm value={options as MergeMusicOptions} onChange={setOptions} />
          )}
          {kind === "muteVideo" && (
            <p className="field-hint">No settings needed — the video stream is copied untouched and the audio track is dropped.</p>
          )}
          {kind === "extractAudio" && (
            <ExtractAudioForm value={options as ExtractAudioOptions} onChange={setOptions} />
          )}
        </div>

        <h3 className="section-label">Source &amp; Export</h3>
        <div className="config-card">
          <div className="field-row">
            <div className="field-label">
              <span>Selected clip{selectedClips.length === 1 ? "" : "s"}</span>
              <span className="tabular">{selectedClips.length}</span>
            </div>
            {selectedClips.length === 0 && (
              <p className="field-hint">Select one or more clips in the Media Bin on the left.</p>
            )}
            {batchMode && !meta.supportsBatch && (
              <p className="field-hint" style={{ color: "var(--danger)" }}>
                {meta.title} only works on a single clip at a time — select just one.
              </p>
            )}
            {batchMode && meta.supportsBatch && (
              <p className="field-hint">
                Batch mode: you’ll be asked for a destination folder; each output is named automatically.
              </p>
            )}
          </div>
          <div className="field-row">
            <div className="export-row">
              <div className={`export-path${selectedClips.length === 0 ? " empty" : ""}`}>
                {selectedClips.length === 0
                  ? "No source selected"
                  : selectedClips.length === 1
                  ? selectedClips[0].fileName
                  : `${selectedClips.length} files → chosen folder`}
              </div>
            </div>
          </div>
        </div>

        <div className="run-bar">
          <button className="btn btn-primary" disabled={!canRun || running} onClick={handleRun}>
            {running ? "Starting\u2026" : `Run ${meta.title}`}
          </button>
          {notice && <span className="field-hint">{notice}</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- per-operation option forms ---------------- */

function ConvertForm({ value, onChange }: { value: ConvertOptions; onChange: (o: OperationOptions) => void }) {
  return (
    <>
      <div className="field-row">
        <div className="field-label">Output format</div>
        <div className="pill-group">
          {CONVERT_FORMATS.map((f) => (
            <button
              key={f.key}
              className={`pill${value.format === f.key ? " active" : ""}`}
              onClick={() => onChange({ ...value, format: f.key as ConvertFormatKey })}
              title={f.hint}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <div className="field-label">Quality preset</div>
        <div className="pill-group">
          {CONVERT_PRESETS.map((p) => (
            <button
              key={p.key}
              className={`pill${value.preset === p.key ? " active" : ""}`}
              onClick={() => onChange({ ...value, preset: p.key as ConvertPresetKey })}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function SpeedForm({ value, onChange }: { value: ChangeSpeedOptions; onChange: (o: OperationOptions) => void }) {
  const percent = Math.round(value.rate * 100);

  const setPercent = (p: number) => {
    const clamped = Math.min(1000, Math.max(5, p));
    onChange({ ...value, rate: clamped / 100 });
  };

  return (
    <>
      <div className="field-row">
        <div className="field-label">
          <span>Playback rate</span>
          <span className="tabular">{value.rate.toFixed(2)}x</span>
        </div>
        <div className="speed-dial">
          <div className="speed-value">{percent}%</div>
          <input
            className="speed-slider"
            type="range"
            min={10}
            max={400}
            step={5}
            value={Math.min(400, percent)}
            style={{ "--fill": `${(Math.min(400, percent) - 10) / (400 - 10) * 100}%` } as React.CSSProperties}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
        </div>
        <p className="field-hint">Drag the slider, type an exact percentage below, or pick a quick preset.</p>
      </div>

      <div className="field-row">
        <div className="pill-group">
          {SPEED_PRESETS.map((p) => (
            <button key={p} className={`pill${percent === p ? " active" : ""}`} onClick={() => setPercent(p)}>
              {p >= 100 ? `${p / 100}x` : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field-label">Exact value</div>
        <input
          type="number"
          min={5}
          max={1000}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          style={{ width: 120 }}
        />
        <p className="field-hint">Percent of original speed — e.g. 10 = one-tenth speed, 800 = 8x.</p>
      </div>

      <div className="toggle-row">
        <div>
          <div className="field-label" style={{ marginBottom: 2 }}>
            Preserve pitch
          </div>
          <p className="field-hint" style={{ margin: 0 }}>
            Off gives the classic tape-speed pitch shift instead.
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={value.preservePitch}
            onChange={(e) => onChange({ ...value, preservePitch: e.target.checked })}
          />
          <span className="switch-track" />
        </label>
      </div>
    </>
  );
}

function PanCropForm({ value, onChange }: { value: PanCropOptions; onChange: (o: OperationOptions) => void }) {
  return (
    <>
      <div className="field-row">
        <div className="field-label">Target aspect ratio</div>
        <div className="pill-group">
          {ASPECT_PRESETS.map((a) => (
            <button key={a} className={`pill${value.aspect === a ? " active" : ""}`} onClick={() => onChange({ ...value, aspect: a })}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <div className="field-label">Pan direction</div>
        <div className="pill-group">
          <button className={`pill${value.direction === "ltr" ? " active" : ""}`} onClick={() => onChange({ ...value, direction: "ltr" })}>
            Start → End
          </button>
          <button className={`pill${value.direction === "rtl" ? " active" : ""}`} onClick={() => onChange({ ...value, direction: "rtl" })}>
            End → Start
          </button>
        </div>
      </div>
      <div className="field-row">
        <div className="field-label">
          <span>Output height (px)</span>
          <span className="tabular">{value.height}</span>
        </div>
        <input
          type="number"
          value={value.height}
          step={10}
          onChange={(e) => onChange({ ...value, height: Number(e.target.value) })}
          style={{ width: 140 }}
        />
      </div>
      <div className="field-row">
        <div className="field-label">
          <span>Quality (CRF, lower = better)</span>
          <span className="tabular">{value.crf}</span>
        </div>
        <input
          className="speed-slider"
          type="range"
          min={12}
          max={30}
          value={value.crf}
          style={{ "--fill": `${((value.crf - 12) / (30 - 12)) * 100}%` } as React.CSSProperties}
          onChange={(e) => onChange({ ...value, crf: Number(e.target.value) })}
        />
      </div>
    </>
  );
}

function MergeMusicForm({ value, onChange }: { value: MergeMusicOptions; onChange: (o: OperationOptions) => void }) {
  const pickMusic = async () => {
    const p = await window.api.pickAudio();
    if (p) onChange({ ...value, musicPath: p });
  };
  const fileName = value.musicPath ? value.musicPath.split(/[\\/]/).pop() : "";
  return (
    <div className="field-row">
      <div className="field-label">Music track</div>
      <div className="export-row">
        <div className={`export-path${!value.musicPath ? " empty" : ""}`}>{fileName || "No file chosen"}</div>
        <button className="btn" style={{ width: "auto" }} onClick={pickMusic}>
          <IconFolder size={14} />
          Choose&hellip;
        </button>
      </div>
      <p className="field-hint">Music is trimmed (or silence-padded) to exactly match the video’s length.</p>
    </div>
  );
}

function ExtractAudioForm({ value, onChange }: { value: ExtractAudioOptions; onChange: (o: OperationOptions) => void }) {
  const bitrates: ExtractAudioOptions["bitrate"][] = ["96k", "128k", "192k", "256k", "320k"];
  return (
    <>
      <div className="field-row">
        <div className="field-label">MP3 bitrate</div>
        <div className="pill-group">
          {bitrates.map((b) => (
            <button key={b} className={`pill${value.bitrate === b ? " active" : ""}`} onClick={() => onChange({ ...value, bitrate: b })}>
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="toggle-row">
        <div className="field-label">Downmix to mono</div>
        <label className="switch">
          <input type="checkbox" checked={value.mono} onChange={(e) => onChange({ ...value, mono: e.target.checked })} />
          <span className="switch-track" />
        </label>
      </div>
    </>
  );
}
