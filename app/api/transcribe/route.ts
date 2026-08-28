import { NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "ASSEMBLYAI_API_KEY is missing" },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Audio file is missing" },
        { status: 400 }
      );
    }

    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });

    const transcript = await client.transcripts.transcribe({
      audio: Buffer.from(await file.arrayBuffer())
    });

    if (transcript.status === "error") {
      return NextResponse.json(
        { error: transcript.error || "Transcription failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: transcript.text || "",
      confidence: transcript.confidence ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed"
      },
      { status: 500 }
    );
  }
}
