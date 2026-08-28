import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

function fallback(data: any) {
  const answers = Array.isArray(data.answers) ? data.answers : [];

  const questionResults = answers.map((answer: any) => {
    const text = String(answer.transcript || "").toLowerCase();
    const topics = Array.isArray(answer.expectedTopics)
      ? answer.expectedTopics
      : [];

    const matched = topics.filter((topic: string) =>
      text.includes(String(topic).toLowerCase())
    );

    const score = topics.length
      ? Math.round((matched.length / topics.length) * 100)
      : text.length > 80
        ? 60
        : 35;

    return {
      id: String(answer.id),
      score,
      reason:
        matched.length > 0
          ? `Covered ${matched.length} expected topic(s).`
          : "Expected concepts were not clearly found in the transcript.",
      missingTopics: topics.filter(
        (topic: string) =>
          !text.includes(String(topic).toLowerCase())
      )
    };
  });

  const technicalScore = questionResults.length
    ? Math.round(
        questionResults.reduce((sum: number, item: any) => sum + item.score, 0) /
          questionResults.length
      )
    : 0;

  const highEvents = (data.integrityEvents || []).filter(
    (event: any) => event.severity === "high"
  ).length;
  const mediumEvents = (data.integrityEvents || []).filter(
    (event: any) => event.severity === "medium"
  ).length;

  const integrityScore = Math.max(
    0,
    100 - highEvents * 15 - mediumEvents * 7
  );

  const overallScore = Math.round(
    technicalScore * 0.65 +
      60 * 0.15 +
      60 * 0.1 +
      integrityScore * 0.1
  );

  return {
    overallScore,
    technicalScore,
    communicationScore: 60,
    clarityScore: 60,
    speakingScore: 60,
    integrityScore,
    level:
      overallScore >= 90
        ? "Exceptional"
        : overallScore >= 80
          ? "Strong"
          : overallScore >= 70
            ? "Good"
            : overallScore >= 60
              ? "Borderline"
              : "Needs significant improvement",
    strengths: ["Fallback scoring was used because AI evaluation was unavailable."],
    improvements: [
      "Configure OPENAI_API_KEY and verify the configured model for detailed qualitative scoring."
    ],
    reasons: [
      "Fallback scoring checks expected-topic coverage and recorded integrity events."
    ],
    questionResults,
    source: "fallback"
  };
}

export async function POST(request: Request) {
  const data = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(fallback(data));
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
You are a strict but fair technical interview evaluator.

Evaluate only the evidence supplied in the candidate transcripts and metrics.
Do not invent knowledge or performance that is not present.

Hard scoring scale:
90-100: exceptional and technically precise
80-89: strong
70-79: good but with clear gaps
60-69: borderline
below 60: weak or insufficient

Score:
- technical correctness
- relevance
- communication
- clarity
- speaking quality based only on transcript evidence and timing
- integrity based on supplied browser/video observations

Do not infer personality, honesty, intelligence, confidence, emotion, or cheating
from eye movement or appearance.

Return ONLY valid JSON with exactly:
{
  "overallScore": number,
  "technicalScore": number,
  "communicationScore": number,
  "clarityScore": number,
  "speakingScore": number,
  "integrityScore": number,
  "level": string,
  "strengths": string[],
  "improvements": string[],
  "reasons": string[],
  "questionResults": [
    {
      "id": string,
      "score": number,
      "reason": string,
      "missingTopics": string[]
    }
  ]
}

Interview data:
${JSON.stringify(data)}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: prompt
    });

    let result: any;
    try {
      result = JSON.parse(response.output_text);
    } catch {
      throw new Error("The configured AI model did not return valid JSON.");
    }

    return NextResponse.json({
      ...result,
      source: "openai"
    });
  } catch (error) {
    const base = fallback(data);
    return NextResponse.json({
      ...base,
      aiError:
        error instanceof Error ? error.message : "AI evaluation failed"
    });
  }
}
