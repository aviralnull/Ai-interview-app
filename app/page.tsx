"use client";

import { useState } from "react";
import ApiStatus from "@/components/ApiStatus";
import InterviewSetup from "@/components/InterviewSetup";
import InterviewRoom from "@/components/InterviewRoom";
import Report from "@/components/Report";
import type { AnswerResult, IntegrityEvent, InterviewQuestion } from "@/lib/types";

type Session = {
  questions: InterviewQuestion[];
  stream: MediaStream;
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [finished, setFinished] = useState<{
    answers: AnswerResult[];
    integrityEvents: IntegrityEvent[];
    videoBlob: Blob | null;
  } | null>(null);
  const [report, setReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function analyze(data: {
    answers: AnswerResult[];
    integrityEvents: IntegrityEvent[];
    videoBlob: Blob | null;
  }) {
    setFinished(data);
    setSession(null);
    setAnalyzing(true);

    let videoAnalysis: any = {
      summary: "Video analysis was not run.",
      observations: [],
      integrityRisk: 0
    };

    if (data.videoBlob) {
      try {
        const form = new FormData();
        form.append("video", data.videoBlob, "interview.webm");
        const response = await fetch("/api/video-analyze", {
          method: "POST",
          body: form
        });

        if (response.ok) {
          videoAnalysis = await response.json();
        }
      } catch {}
    }

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: data.answers,
          integrityEvents: data.integrityEvents,
          videoAnalysis
        })
      });

      const result = await response.json();
      setReport(result);
    } catch (error) {
      setReport({
        error: error instanceof Error ? error.message : "Evaluation failed"
      });
    } finally {
      setAnalyzing(false);
    }
  }

  if (session) {
    return (
      <InterviewRoom
        questions={session.questions}
        stream={session.stream}
        onFinish={analyze}
      />
    );
  }

  if (analyzing) {
    return (
      <main className="shell">
        <h1>Analyzing Interview</h1>
        <div className="card">
          <p>Processing transcript, video observations, integrity events, and final scoring...</p>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <Report
        report={report}
        videoBlob={finished.videoBlob}
        onRestart={() => {
          setFinished(null);
          setReport(null);
        }}
      />
    );
  }

  return (
    <main className="shell">
      <header>
        <div>
          <h1>AI Interviewer V4</h1>
          <p className="muted">Personal AI-powered interview practice</p>
        </div>
        <span className="pill">3 minutes per answer</span>
      </header>

      <ApiStatus />

      <InterviewSetup
        onStart={({ questions, stream }) => setSession({ questions, stream })}
      />
    </main>
  );
}
