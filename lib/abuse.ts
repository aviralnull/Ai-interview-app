// Built-in baseline list. The AI evaluator can still flag abusive/prohibited language
// based on transcript context; users are not asked to upload a word list.
export const prohibitedWords = [
  "fuck", "fucking", "shit", "bitch", "asshole", "bastard",
  "motherfucker", "chutiya", "madarchod", "bhenchod"
];

export function findProhibitedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return prohibitedWords.filter((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
  });
}
