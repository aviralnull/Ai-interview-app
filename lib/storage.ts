import type { InterviewQuestion } from "./types";

const KEY = "ai-interviewer-v4-questions";

export function saveQuestions(questions: InterviewQuestion[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(questions));
  }
}

export function loadQuestions(): InterviewQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
