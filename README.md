# Video Forge

A local desktop video editor UI that wraps `ffmpeg` for six operations:
Convert, Change Speed, Pan & Crop, Add Music, Mute, and Extract Audio.
Electron + React + TypeScript, strict OOP core, single-window app.

## Why Electron, not plain React

A browser page (plain React/Next/whatever) cannot spawn `ffmpeg`, read
arbitrary paths on your disk, or open native "Save As" dialogs — browsers
sandbox all of that away deliberately. The actual dependency your scripts
have is **ffmpeg**, not Python, so the fix isn't "run Python somehow inside
React" — it's pairing the React UI with a Node.js process that can shell out
to ffmpeg and touch the filesystem. Electron packages exactly that pairing
into one local desktop app: same React UI, plus a Node "main process" for
everything OS-level. (The alternative — a local Python/FastAPI server the
React page talks to over HTTP — also works, but ships an extra
server-lifecycle problem for a single-user local tool with no upside.)

## Setup

```bash
npm install
npm run dev        # hot-reloading dev app (Vite + Electron)
```

You also need `ffmpeg` and `ffprobe` on your PATH:

```bash
# macOS
brew install ffmpeg
# Ubuntu/Debian
sudo apt install ffmpeg
# Windows
winget install ffmpeg
```

The app checks for both on launch and shows a red/green dot in the header.

### Production build

```bash
npm run build       # compiles main+preload, builds the renderer
npm run package      # builds installers via electron-builder, fetched
                      # on-demand with npx — see note below
```

**Why `electron-builder` isn't in `package.json`:** every current Electron
packaging tool (`electron-builder`, and even the officially-recommended
`@electron-forge/cli` — I tested both) pulls in a handful of old transitive
packages (`glob@7`, `inflight`, `rimraf@2/3`, `boolean`) via
`@electron/get`/`node-gyp`-adjacent internals that haven't been modernized
upstream. It's not something fixable from this project's `package.json` —
it's the same in a brand-new empty project with either tool installed.
Since you only need a packager when cutting an installer, not for day-to-day
`npm install`/`npm run dev`, it's kept out of `devDependencies` entirely and
fetched on demand via `npx` only when you actually run `npm run package`.
That keeps every dependency `npm install` resolves at latest, with zero
deprecation warnings.

## Architecture

```
src/
  shared/                  # types + operation catalog — the ONE contract
    types.ts                 both processes and every component import
    operationCatalog.ts       from. Change an operation's suffix/extension
                               here and main + renderer both pick it up.

  main/                     # Node process — the only place that touches
    main.ts                    fs, child_process, or native dialogs.
    preload.ts                Thin IPC layer only; no business logic.
    ffmpeg/
      FfmpegJob.ts            Abstract base class: spawns ffmpeg, parses
                              `-progress pipe:1`, reports %, resolves
                              ok/error. Every operation subclasses this and
                              only implements buildArgs() — argv + expected
                              duration. Adding a 7th operation means adding
                              one small class here, nothing else changes.
      ConvertVideoJob.ts      } one class per operation, each ported 1:1
      ExtractAudioJob.ts      } from the original Python script's ffmpeg
      MuteVideoJob.ts         } logic (same flags, same filter math).
      PanCropJob.ts           }
      MergeMusicJob.ts        }
      ChangeSpeedJob.ts       } NEW: speed control (see below).
      JobFactory.ts           Maps an operation kind -> its Job class.
      probe.ts                ffprobe wrapper (duration/streams/etc).
    services/
      OutputResolver.ts      The ONLY place output filenames/paths are
                              decided — single-file naming, batch naming
                              into a folder with collision-avoidance
                              ("file (2).mp4"), and pre-flight validation.
                              Both the "Save As" flow and the "export N
                              clips to a folder" flow go through this, so
                              there is exactly one naming policy in the app
                              (previously every script picked its own
                              suffix ad hoc — `_no_audio.mp4` here,
                              `.with_suffix(".mp3")` there).
      JobQueueManager.ts      The ONLY place that runs ffmpeg jobs. Caps
                              concurrency (2 at once, tunable), queues the
                              rest, owns cancellation, emits progress/done
                              events. main.ts is now a thin IPC layer over
                              this — it doesn't run anything itself.

  renderer/                 # React UI — talks to window.api ONLY, never
                             # to Node/fs directly (contextIsolation: true,
                             # sandbox: true).
    state/
      Store.ts                Tiny observable-snapshot base class
                              (useSyncExternalStore-compatible).
      ClipLibrary.ts          Single source of truth for imported clips +
                              selection. Every panel reads from this, so
                              selecting a clip anywhere updates everywhere.
      JobQueueStore.ts        Mirrors JobQueueManager on the renderer side;
                              subscribes to progress/done exactly once.
      hooks.ts                useClipLibrary() / useJobQueue() — the only
                              two hooks components need for shared state.
    components/
      ClipBin.tsx             Left panel: import, list, select clips.
      OperationPanel.tsx      Center: operation picker + per-operation
                              option form + export/run.
      JobQueue.tsx            Bottom "reel strip": live queue with
                              progress bars, cancel, and results.
```

### Why this shape

- **One naming authority, one execution authority.** Before this pass, each
  script decided its own output name and there was no shared concurrency
  control — fine for a CLI run once, not for a UI where you might select 20
  clips and click Run. `OutputResolver` and `JobQueueManager` fix that by
  being the single place each concern lives, on the main-process side where
  the filesystem and process spawning actually happen.
- **One typed contract (`shared/types.ts` + `operationCatalog.ts`).** The
  renderer can't send a shape ffmpeg-jobs don't expect, and adding an
  operation's metadata (title, suffix, default extension, batch support) in
  one place drives both the picker UI and the backend's file naming.
- **Renderer state mirrors main-process state, not the DOM.** `ClipLibrary`
  and `JobQueueStore` are plain TS classes with a pub-sub snapshot, wired to
  React via `useSyncExternalStore` — components render off one source of
  truth instead of prop-drilling or duplicating state per screen.
- **Batch export "just works"** because every operation flows through the
  same two paths in `OperationPanel`: 1 clip selected → native Save-As
  dialog; 2+ clips selected → pick a folder, `resolveBatchOutputs` names
  every file safely. `mergeMusic` opts out of batch (`supportsBatch: false`
  in the catalog) since it inherently needs one video + one music file.

## New feature: Change Speed

`ChangeSpeedJob` accepts any positive rate (UI exposes it as a % slider —
10% to 400%, plus quick presets and an exact-number field, matching "1x,
2x, 10%, 80%" from the brief). Implementation:

- **Video:** `setpts=(1/rate)*PTS` — scales presentation timestamps.
- **Audio, pitch-preserved (default):** ffmpeg's `atempo` filter only
  accepts 0.5–2.0 per stage, so rates outside that range are achieved by
  **chaining multiple `atempo` stages** that multiply out to the requested
  rate (e.g. 4x = `atempo=2.0,atempo=2.0`) — the standard trick for going
  beyond ffmpeg's single-stage limit without pitch artifacts.
- **Audio, pitch not preserved (toggle):** `asetrate` + `aresample`,
  giving the classic tape speed-up/slow-down chipmunk/demon effect.

## What "production ready" would still need

This is a solid, correctly-architected local tool, but a few things are
worth being upfront about if you intend to ship it beyond your own machine:

- **Code signing & auto-update** (electron-builder supports both, not
  configured here — needs your Apple/Windows signing certs).
- **Bundling ffmpeg** instead of requiring it on PATH, if you want
  non-technical users to just install one app (e.g. `ffmpeg-static`,
  ~80MB added to the installer per platform).
- **Automated tests** — the ffmpeg argument-building logic in each `*Job.ts`
  is pure and easy to unit test (no tests included here to keep scope
  focused on the architecture you asked for).
- **Thumbnails** in the media bin currently show a placeholder icon, not a
  real frame grab (an easy ffmpeg `-ss ... -frames:v 1` addition to `probe.ts`
  if you want it).
- **Crash/telemetry reporting** if this leaves "just for me" territory.
