"use client";
import { useEffect, useState } from "react";
import CameraPreview from "./CameraPreview";
import QuestionUploader from "./QuestionUploader";
import type { InterviewQuestion } from "@/lib/types";
import { loadQuestions, saveQuestions } from "@/lib/storage";

const demoQuestions: InterviewQuestion[] = [
  {
    id: "demo-next-1",
    question: "Explain the difference between Server Components and Client Components in Next.js.",
    category: "Next.js",
    difficulty: "medium",
    expectedTopics: ["server rendering", "use client", "hooks", "browser interactivity"]
  }
];

export default function InterviewSetup({
  onStart
}: {
  onStart: (data: { questions: InterviewQuestion[]; stream: MediaStream }) => void;
}) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(demoQuestions);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = loadQuestions();
    if (saved.length) setQuestions(saved);
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function enableCamera() {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream((old) => {
        old?.getVideoTracks().forEach((t) => t.stop());
        const combined = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...(old?.getAudioTracks() || [])
        ]);
        return combined;
      });
      setCameraReady(true);
      setMessage("Camera is ready.");
    } catch {
      setMessage("Camera permission was denied or unavailable.");
    }
  }

  async function enableMic() {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream((old) => {
        old?.getAudioTracks().forEach((t) => t.stop());
        const combined = new MediaStream([
          ...(old?.getVideoTracks() || []),
          ...audioStream.getAudioTracks()
        ]);
        return combined;
      });
      setMicReady(true);
      setMessage("Microphone is ready.");
    } catch {
      setMessage("Microphone permission was denied or unavailable.");
    }
  }

  async function shareScreen() {
    try {
      const shared = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(shared);
      setScreenReady(true);
      shared.getVideoTracks()[0].onended = () => {
        setScreenReady(false);
        setScreenStream(null);
      };
      setMessage("Screen sharing enabled (optional).");
    } catch {
      setMessage("Screen sharing was not enabled. You can still start the interview.");
    }
  }

  function setUploaded(list: InterviewQuestion[]) {
    saveQuestions(list);
    setQuestions(list);
  }

  function start() {
    if (!stream || !cameraReady || !micReady) {
      setMessage("Camera and microphone are required before starting.");
      return;
    }
    onStart({ questions, stream });
  }

  return (
    <>
      <QuestionUploader onQuestions={setUploaded} />

      <div className="grid">
        <div className="card">
          <h2>Permissions</h2>
          <div className="row">
            <button className="btn" onClick={enableCamera}>
              {cameraReady ? "✓ Camera Ready" : "Enable Camera"}
            </button>
            <button className="btn" onClick={enableMic}>
              {micReady ? "✓ Microphone Ready" : "Enable Microphone"}
            </button>
            <button className="btn secondary" onClick={shareScreen}>
              {screenReady ? "✓ Screen Shared" : "Share Screen (Optional)"}
            </button>
          </div>
          <p className="muted">{message}</p>
          <p>{questions.length} question(s) loaded.</p>
        </div>

        <div className="card">
          <h2>Camera Preview</h2>
          <CameraPreview stream={stream} />
        </div>
      </div>

      <div className="card warning">
        <b>Interview integrity:</b> camera and microphone are required. Screen sharing is optional.
        Tab/window changes and fullscreen exits are recorded. A normal browser cannot permanently block Escape or browser controls from leaving fullscreen.
      </div>

      <button className="btn" onClick={start}>
        Start Interview
      </button>
    </>
  );
}
