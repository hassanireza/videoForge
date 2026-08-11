import React, { useEffect, useState } from "react";
import ClipBin from "./components/ClipBin";
import OperationPanel from "./components/OperationPanel";
import JobQueue from "./components/JobQueue";
import { Logo, IconAlert } from "./icons/Icons";

/**
 * Renders if window.api never got attached (preload script failed to load,
 * a stale/mismatched build, or this page was opened directly in a browser
 * tab instead of through the Electron window).
 */
function BridgeMissingScreen() {
  return (
    <div className="diagnostic-screen">
      <IconAlert size={30} className="tabular" />
      <div className="diagnostic-title">Can&rsquo;t reach the app backend</div>
      <p className="diagnostic-body">
        <code>window.api</code> was never attached, which means the Electron preload script didn&rsquo;t run. This
        usually means:
      </p>
      <ul className="diagnostic-list">
        <li>
          This page is open in a regular browser tab instead of the Electron window &mdash; run{" "}
          <code>npm run dev</code> and use the Electron window it opens, not{" "}
          <code>http://localhost:5173</code> directly.
        </li>
        <li>
          The main/preload build is stale &mdash; stop the dev process and run <code>npm run dev</code> again (or{" "}
          <code>npm run build:electron</code> for a production build).
        </li>
        <li>
          <code>package.json</code>&rsquo;s <code>"main"</code> field doesn&rsquo;t point at the actual compiled{" "}
          <code>main.js</code> path.
        </li>
      </ul>
    </div>
  );
}

export default function App() {
  const [ffmpegOk, setFfmpegOk] = useState<boolean | null>(null);
  const [ffmpegMessage, setFfmpegMessage] = useState<string | undefined>();
  const [bridgeReady] = useState(() => typeof window !== "undefined" && !!window.api);

  useEffect(() => {
    if (!bridgeReady) return;
    window.api.checkFfmpeg().then((r) => {
      setFfmpegOk(r.ok);
      setFfmpegMessage(r.message);
    });
  }, [bridgeReady]);

  if (!bridgeReady) return <BridgeMissingScreen />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Logo />
          <div className="brand-text">
            <span className="brand-mark">VideoForge</span>
            <span className="brand-sub">Local ffmpeg toolkit</span>
          </div>
        </div>
        <div className="ffmpeg-status" title={ffmpegMessage}>
          <span className={`status-dot${ffmpegOk === null ? "" : ffmpegOk ? " ok" : " bad"}`} />
          {ffmpegOk === null ? "Checking ffmpeg\u2026" : ffmpegOk ? "ffmpeg ready" : "ffmpeg not found"}
        </div>
      </header>

      <div className="app-main">
        <ClipBin />
        <OperationPanel />
      </div>

      <JobQueue />
    </div>
  );
}
