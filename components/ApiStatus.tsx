"use client";
import { useEffect, useState } from "react";

type Status = {
  assemblyAI?: { configured: boolean };
  gemini?: { configured: boolean; model?: string };
  openAI?: { configured: boolean; model?: string };
};

export default function ApiStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({}));
  }, []);

  const item = (name: string, configured?: boolean, model?: string) => (
    <div className="statusbox">
      <b>{name}</b><br />
      <span className={configured ? "ok" : "bad"}>
        {configured ? "✓ configured" : "✕ missing key"}
      </span>
      {model ? <div className="muted">{model}</div> : null}
    </div>
  );

  return (
    <div className="card">
      <h2>API Status</h2>
      <div className="grid">
        {item("AssemblyAI", status?.assemblyAI?.configured)}
        {item("Gemini", status?.gemini?.configured, status?.gemini?.model)}
        {item("OpenAI", status?.openAI?.configured, status?.openAI?.model)}
      </div>
      <p className="muted">
        Paste keys into .env.local and restart the development server.
      </p>
    </div>
  );
}
