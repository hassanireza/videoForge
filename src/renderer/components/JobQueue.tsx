import React from "react";
import { jobQueue } from "../state/JobQueueStore";
import { useJobQueue } from "../state/hooks";
import { formatBytes } from "../format";
import { IconAlert, IconCheck } from "../icons/Icons";

export default function JobQueue() {
  const { jobs } = useJobQueue();
  const activeCount = jobs.filter((j) => j.status === "running" || j.status === "queued").length;

  return (
    <div className="reel-strip">
      <div className="reel-header">
        <span className="bin-title">Export Queue{activeCount > 0 ? ` \u00B7 ${activeCount} running` : ""}</span>
        {jobs.some((j) => j.status === "done" || j.status === "error" || j.status === "cancelled") && (
          <button
            className="btn-ghost btn"
            style={{ width: "auto", padding: "4px 10px" }}
            onClick={() => jobQueue.clearFinished()}
          >
            Clear finished
          </button>
        )}
      </div>
      <div className="reel-list">
        {jobs.length === 0 && (
          <div className="reel-empty">Nothing exported yet &mdash; configure an operation and hit Run.</div>
        )}
        {jobs.map((job) => (
          <div className="job-card" key={job.id}>
            <div className="job-top">
              <div className="job-name" title={job.outputPath}>
                {job.label}
              </div>
              <div
                className={`job-stage${job.status === "done" ? " ok" : job.status === "error" ? " err" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                {job.status === "done" && <IconCheck size={12} />}
                {job.status === "error" && <IconAlert size={12} />}
                {job.status === "running"
                  ? `${job.stage} \u00B7 ${Math.round(job.percent)}%`
                  : job.status === "done"
                  ? "Done"
                  : job.status === "error"
                  ? "Failed"
                  : job.status === "cancelled"
                  ? "Cancelled"
                  : "Queued"}
              </div>
              {(job.status === "running" || job.status === "queued") && (
                <button
                  className="btn-ghost btn"
                  style={{ width: "auto", padding: "3px 9px" }}
                  onClick={() => jobQueue.cancel(job.id)}
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill${job.status === "error" ? " err" : ""}`}
                style={{ width: `${job.status === "error" ? 100 : job.percent}%` }}
              />
            </div>
            {job.status === "done" && (
              <div className="job-meta">
                {formatBytes(job.sizeBeforeBytes)} → {formatBytes(job.sizeAfterBytes)} &middot; saved to{" "}
                {job.outputPath}
              </div>
            )}
            {job.status === "error" && job.error && <div className="job-error">{job.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
