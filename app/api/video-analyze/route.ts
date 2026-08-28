import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing" },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get("video");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Video file is missing" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const prompt = `
Analyze this interview recording for observable events only.
Return valid JSON with:
{
  "summary": "string",
  "integrityRisk": number from 0 to 100,
  "observations": [
    {
      "timestamp": "optional timestamp",
      "event": "observable event",
      "severity": "low|medium|high",
      "evidence": "short explanation"
    }
  ]
}

Look for concrete events such as:
- no person visible for a sustained period
- another person visibly appearing
- camera obstruction
- major recording interruption

Do NOT infer cheating, personality, honesty, intelligence, confidence, emotion,
mental state, race, gender, disability, or intent from appearance.
Do not treat ordinary eye movement or looking away as cheating.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type || "video/webm",
                data: base64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    let result: any;
    try {
      result = JSON.parse(response.text || "{}");
    } catch {
      result = {
        summary: response.text || "No parseable result",
        observations: [],
        integrityRisk: 0
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Video analysis failed"
      },
      { status: 500 }
    );
  }
}
