"use client";

import { useState } from "react";

export default function Report({
  report,
  videoBlob,
  onRestart
}: {
  report: any;
  videoBlob: Blob | null;
  onRestart: () => void;
}) {
  const [saved, setSaved] = useState(false);

  function downloadVideo() {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-interview-${Date.now()}.webm`;
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  const scoreKeys = [
    ["Technical", "technicalScore"],
    ["Communication", "communicationScore"],
    ["Clarity", "clarityScore"],
    ["Speaking", "speakingScore"],
    ["Integrity", "integrityScore"]
  ];

  return (
    <div className="shell">
      <h1>Interview Report</h1>

      {report?.error ? (
        <div className="card warning">
          <b>Analysis issue:</b> {report.error}
        </div>
      ) : null}

      <div className="card">
        <div className="score">{report?.overallScore ?? "—"}/100</div>
        <h2>{report?.level || "Interview completed"}</h2>
        <p className="muted">Evaluation source: {report?.source || "unknown"}</p>
      </div>

      <div className="grid">
        {scoreKeys.map(([label, key]) => (
          <div className="card" key={key}>
            <b>{label}</b>
            <div className="smallscore">{report?.[key] ?? "—"}/100</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Strengths</h2>
        <ul>{(report?.strengths || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        <h2>Where to improve</h2>
        <ul>{(report?.improvements || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        <h2>Reasons</h2>
        <ul>{(report?.reasons || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      </div>

      <div className="card">
        <h2>Question-wise results</h2>
        <pre>{JSON.stringify(report?.questionResults || [], null, 2)}</pre>
      </div>

      <div className="card">
        <h2>Interview Video</h2>
        <p className="muted">
          The recording is kept only in the current browser session unless you choose to save it.
        </p>
        <button className="btn" onClick={downloadVideo} disabled={!videoBlob}>
          {saved ? "✓ Video Saved" : "Save Interview Video"}
        </button>
      </div>

      <button className="btn secondary" onClick={onRestart}>
        Start New Interview
      </button>
    </div>
  );
}
