"use client";
import { useEffect, useRef } from "react";

export default function CameraPreview({
  stream,
  muted = true
}: {
  stream: MediaStream | null;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    if (stream) {
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  return <video ref={ref} className="video" autoPlay playsInline muted={muted} />;
}
