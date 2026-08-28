"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CameraPreview from "./CameraPreview";
import { findProhibitedWords } from "@/lib/abuse";
import type {
  AnswerResult,
  IntegrityEvent,
  InterviewQuestion,
  VideoAnalysis
} from "@/lib/types";

type Props = {
  questions: InterviewQuestion[];
  stream: MediaStream;
  onFinish: (data: {
    answers: AnswerResult[];
    integrityEvents: IntegrityEvent[];
    videoBlob: Blob | null;
  }) => void;
};

const ANSWER_SECONDS = 180;

export default function InterviewRoom({ questions, stream, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ANSWER_SECONDS);
  const [status, setStatus] = useState("Preparing interviewer...");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<IntegrityEvent[]>([]);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const videoRecorder = useRef<MediaRecorder | null>(null);
  const answerRecorder = useRef<MediaRecorder | null>(null);
  const videoChunks = useRef<Blob[]>([]);
  const audioChunks = useRef<Blob[]>([]);
  const answerStartedAt = useRef<number>(Date.now());
  const answersRef = useRef<AnswerResult[]>([]);
  const eventsRef = useRef<IntegrityEvent[]>([]);
  const finishing = useRef(false);

  const question = questions[index];
  const time = useMemo(
    () => `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`,
    [secondsLeft]
  );

  function addEvent(
    type: string,
    severity: IntegrityEvent["severity"],
    message: string
  ) {
    const event: IntegrityEvent = {
      type,
      severity,
      message,
      at: new Date().toISOString(),
      questionId: question?.id
    };
    eventsRef.current = [...eventsRef.current, event];
    setEvents(eventsRef.current);
    setWarning(message);
  }

  function startAnswerRecording() {
    if (answerRecorder.current?.state === "recording") return;
    const audioStream = new MediaStream(stream.getAudioTracks());
    audioChunks.current = [];
    answerStartedAt.current = Date.now();

    const recorder = new MediaRecorder(audioStream);
    answerRecorder.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.current.push(event.data);
    };

    recorder.start(1000);
  }

  function speakQuestion(text: string) {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => {
      setStatus("Answer now. You may finish early.");
      startAnswerRecording();
    };
    window.speechSynthesis.speak(utterance);
  }

  function startVideoRecording() {
    videoChunks.current = [];
    const recorder = new MediaRecorder(stream);
    videoRecorder.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) videoChunks.current.push(event.data);
    };

    recorder.start(1000);
  }

  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement && !finishing.current) {
        addEvent(
          "FULLSCREEN_EXIT",
          "medium",
          "Fullscreen exit detected and recorded."
        );
      }
    };

    const handleVisibility = () => {
      if (document.hidden && !finishing.current) {
        addEvent(
          "TAB_OR_WINDOW_CHANGE",
          "high",
          "Tab or window change detected and recorded."
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [question?.id]);

  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => {});
    startVideoRecording();
    setStatus("Listen carefully to the question...");
    const timer = window.setTimeout(() => {
      if (question) speakQuestion(question.question);
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (busy) return;
    if (secondsLeft <= 0) {
      finishAnswer();
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [secondsLeft, busy]);

  async function transcribe(blob: Blob) {
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Transcription failed");
    }

    return String(data.text || "");
  }

  async function finishAnswer() {
    if (busy || !question || finishing.current) return;
    setBusy(true);
    setStatus("Processing your answer...");

    const recorder = answerRecorder.current;
    if (recorder?.state === "recording") {
      recorder.stop();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
    let transcript = "";
    let transcriptionError: string | undefined;

    try {
      transcript = await transcribe(audioBlob);
    } catch (error) {
      transcriptionError =
        error instanceof Error ? error.message : "Transcription unavailable";
    }

    const abusiveWords = findProhibitedWords(transcript);
    if (abusiveWords.length > 0) {
      addEvent(
        "PROHIBITED_LANGUAGE",
        "high",
        "Prohibited language was detected and recorded."
      );
    }

    const result: AnswerResult = {
      ...question,
      transcript,
      durationSeconds: Math.max(
        1,
        Math.round((Date.now() - answerStartedAt.current) / 1000)
      ),
      abusiveWords,
      transcriptionError
    };

    answersRef.current = [...answersRef.current, result];
    setAnswers(answersRef.current);

    if (index + 1 >= questions.length) {
      await finishInterview();
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    setSecondsLeft(ANSWER_SECONDS);
    setWarning(null);
    setStatus("Listen carefully to the next question...");
    setBusy(false);

    window.setTimeout(() => {
      speakQuestion(questions[nextIndex].question);
    }, 400);
  }

  async function finishInterview() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setStatus("Finalizing interview...");

    if (answerRecorder.current?.state === "recording") {
      answerRecorder.current.stop();
    }

    if (videoRecorder.current?.state === "recording") {
      videoRecorder.current.stop();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const videoBlob =
      videoChunks.current.length > 0
        ? new Blob(videoChunks.current, { type: "video/webm" })
        : null;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    onFinish({
      answers: answersRef.current,
      integrityEvents: eventsRef.current,
      videoBlob
    });
  }

  return (
    <div className="shell">
      <header>
        <div>
          <span className="pill">Question {index + 1} / {questions.length}</span>
          <div className="timer">{time}</div>
        </div>
        <button className="btn danger" onClick={finishInterview} disabled={busy}>
          Finish Interview
        </button>
      </header>

      {warning ? (
        <div className="card warning">
          <b>Warning:</b> {warning}
        </div>
      ) : null}

      <div className="grid">
        <div className="card">
          <h2>{question?.category || "Interview Question"}</h2>
          <p className="question">{question?.question}</p>
          <p className="muted">{status}</p>
          <div className="row">
            <button className="btn" disabled={busy} onClick={finishAnswer}>
              {busy ? "Processing..." : "Finish Answer"}
            </button>
            <button
              className="btn secondary"
              onClick={() => question && speakQuestion(question.question)}
              disabled={busy}
            >
              Repeat Question
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Live Camera</h2>
          <CameraPreview stream={stream} />
          <p className="ok">● Camera and recording active</p>
        </div>
      </div>

      <div className="card">
        <h3>Integrity events: {events.length}</h3>
        <p className="muted">
          Only concrete browser events are recorded here. Video analysis is handled separately and is limited to observable events.
        </p>
      </div>
    </div>
  );
}
