export type InterviewQuestion = {
  id: string;
  question: string;
  category?: string;
  difficulty?: "easy" | "medium" | "hard" | string;
  expectedTopics?: string[];
};

export type IntegrityEvent = {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  at: string;
  questionId?: string;
};

export type AnswerResult = InterviewQuestion & {
  transcript: string;
  durationSeconds: number;
  abusiveWords: string[];
  transcriptionError?: string;
};

export type VideoAnalysis = {
  summary: string;
  observations: Array<{
    timestamp?: string;
    event: string;
    severity: string;
    evidence?: string;
  }>;
  integrityRisk: number;
};
