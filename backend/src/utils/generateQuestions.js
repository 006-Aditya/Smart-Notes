import ollama from "ollama";

const MODEL = "ministral-3:3b-cloud";

async function callOllama(prompt) {
  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  return response?.message?.content || "";
}

export async function generateExpectedQuestions(text) {
  try {
    const trimmed = text.slice(0, 3000); // avoid token overload

    const prompt = `
You are an expert academic assistant.

From the given study material, generate 15 to 20 IMPORTANT EXAM QUESTIONS.

STRICT RULES:
- Questions must be relevant to exams
- Mix of short, long, and conceptual questions
- Avoid repetition
- Each question must end with '?'
- Return ONLY a numbered list

CONTENT:
${trimmed}

QUESTIONS:
`;

    const result = await callOllama(prompt);

    if (!result) {
        console.log("⚠️ Empty/invalid question output");
        return [];
    }

    // Convert string → array
    const questions = result
    .split("\n")
    .map(q =>
        q
        .replace(/^\d+[\).\s-]*/, "")   // remove "1." "1)" etc
        .replace(/^[-•]\s*/, "")       // remove bullet points
        .trim()
    )
    .filter(q => q.length > 15)        // avoid short junk
    .filter(q => q.endsWith("?"));     // ensure it's a question

    return questions.slice(0, 20);

  } catch (err) {
    console.error("❌ Question generation failed:", err);
    return [];
  }
}