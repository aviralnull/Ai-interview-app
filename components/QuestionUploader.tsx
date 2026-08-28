"use client";
import { useState } from "react";
import type { InterviewQuestion } from "@/lib/types";

export default function QuestionUploader({
  onQuestions
}: {
  onQuestions: (questions: InterviewQuestion[]) => void;
}) {
  const [message, setMessage] = useState("");

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = JSON.parse(await file.text());
      const list = Array.isArray(raw) ? raw : raw.questions;

      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("No questions found");
      }

      const normalized: InterviewQuestion[] = list.map((item, index) => ({
        id: String(item.id || `question-${index + 1}`),
        question: String(item.question || ""),
        category: item.category ? String(item.category) : "General",
        difficulty: item.difficulty ? String(item.difficulty) : "medium",
        expectedTopics: Array.isArray(item.expectedTopics)
          ? item.expectedTopics.map(String)
          : []
      }));

      if (normalized.some((q) => !q.question.trim())) {
        throw new Error("Every question needs a question field");
      }

      onQuestions(normalized);
      setMessage(`${normalized.length} questions loaded and saved locally.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON file.");
    }
  }

  return (
    <div className="card">
      <h2>Interview Questions</h2>
      <input type="file" accept=".json,application/json" onChange={upload} />
      <p className="muted">{message || "Upload a JSON array of questions."}</p>
    </div>
  );
}
