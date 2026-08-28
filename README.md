# AI Interviewer V4

A personal interview practice application built with Next.js.

## Included

- JSON interview question upload and local persistence
- Required camera and microphone
- Optional screen sharing
- Live camera preview before and during the interview
- Browser voice reads each question
- 3-minute answer timer
- Finish an answer early
- Browser video recording
- AssemblyAI speech-to-text
- Built-in prohibited-language detection
- Tab/window change detection
- Fullscreen exit detection
- Gemini observable video analysis
- OpenAI strict final evaluation
- Explicit fallback scoring when AI evaluation is unavailable
- Option to save the interview video locally after completion

## Important privacy/design behavior

Video observations are limited to concrete, observable events.
The app does not infer cheating from gaze, emotion, personality, intelligence,
honesty, or appearance.

## Install

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Edit `.env.local`:

```env
ASSEMBLYAI_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-5.6-luna
```

Restart after changing environment variables:

```bash
npm run dev
```

## Question JSON format

```json
[
  {
    "id": "next-1",
    "question": "Explain Server Components and Client Components in Next.js.",
    "category": "Next.js",
    "difficulty": "medium",
    "expectedTopics": [
      "server rendering",
      "use client",
      "hooks",
      "browser interactivity"
    ]
  }
]
```

## Troubleshooting

If you get stale build errors:

```bash
rm -rf .next
npm run dev
```

If dependencies were never installed:

```bash
rm -rf node_modules .next
npm install
npm run dev
```

The API status endpoint is:

```text
/api/ai-status
```

The project intentionally uses that route name consistently.
