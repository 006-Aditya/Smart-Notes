import ollama from "ollama";

const MODEL = "ministral-3:3b-cloud";

async function callOllama(prompt, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ollama.chat({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      });
      return response?.message?.content || "";
    } catch (err) {
      console.error(`❌ Ollama attempt ${attempt + 1} failed:`, err.message);
      if (attempt === maxRetries) return "";
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return "";
}

/**
 * Extract key topics and overview from document text
 */
export async function extractDocumentTopics(documentText) {
  const trimmed = documentText.slice(0, 4000);

  const prompt = `
You are an expert academic content analyzer.

Analyze this study material and extract:
1. A brief 2-3 sentence overview of what this document covers
2. A list of 8-15 KEY TOPICS/CHAPTERS that a student needs to study

STRICT RULES:
- Topics must be concise (3-8 words each)
- Topics should be in logical study order
- Return ONLY valid JSON, no extra text, no markdown backticks

Return this exact JSON format:
{
  "overview": "Brief summary of the document...",
  "keyTopics": [
    "Topic 1 name",
    "Topic 2 name",
    "Topic 3 name"
  ]
}

DOCUMENT CONTENT:
${trimmed}

JSON RESPONSE:
`;

  const result = await callOllama(prompt);

  try {
    // Strip markdown code fences if present
    const cleaned = result
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      overview: parsed.overview || "Study material covering various topics.",
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
    };
  } catch (err) {
    console.error("❌ Failed to parse topics JSON:", err.message);
    console.error("Raw result:", result.slice(0, 300));

    // Fallback: extract any topic-like lines
    const lines = result
      .split("\n")
      .map((l) => l.replace(/^[-•\d.)\s]+/, "").trim())
      .filter((l) => l.length > 5 && l.length < 80);

    return {
      overview: "Study material covering key academic concepts.",
      keyTopics: lines.slice(0, 10),
    };
  }
}

/**
 * Generate a day-by-day study plan
 */
export async function generateStudyPlan({
  keyTopics,
  overview,
  examDate,
  subject,
  startDate,
  totalDays,
  hoursPerDay = 2,
}) {
  if (!keyTopics || keyTopics.length === 0) {
    throw new Error("No key topics provided for study plan generation");
  }

  const topicsList = keyTopics.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `
You are an expert academic study planner.

Create a detailed ${totalDays}-day study plan for a student with an exam on ${examDate}.
The student can study ${hoursPerDay} hours per day.
Subject: ${subject || "General Study"}

Document Overview: ${overview}

Topics to cover:
${topicsList}

RULES:
- Distribute topics evenly across ${totalDays} days
- Earlier days = foundational topics, later days = complex + revision
- Last 1-2 days should ALWAYS be for full revision and practice
- Each day should have 2-4 specific tasks
- Return ONLY valid JSON, no markdown, no extra text

Return this EXACT JSON format (array of ${totalDays} objects):
[
  {
    "day": 1,
    "date": "${startDate}",
    "topics": ["Topic name"],
    "tasks": [
      "Read and understand Topic X (45 min)",
      "Make summary notes (30 min)",
      "Solve 5 practice problems (30 min)"
    ],
    "hours": ${hoursPerDay},
    "focus": "Foundation",
    "difficulty": "easy"
  }
]

difficulty must be one of: "easy", "medium", "hard"
focus should be one of: "Foundation", "Core Concepts", "Deep Dive", "Practice", "Revision", "Mock Test"

JSON ARRAY:
`;

  const result = await callOllama(prompt);

  try {
    const cleaned = result
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Extract JSON array from response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error("No JSON array found in response");

    const parsed = JSON.parse(arrayMatch[0]);

    if (!Array.isArray(parsed)) throw new Error("Response is not an array");

    // Validate and fill missing days
    const validatedPlan = validateAndFillPlan(parsed, totalDays, startDate, hoursPerDay);
    return validatedPlan;
  } catch (err) {
    console.error("❌ Failed to parse study plan JSON:", err.message);
    console.error("Raw result:", result.slice(0, 500));

    // Generate fallback plan
    return generateFallbackPlan(keyTopics, totalDays, startDate, hoursPerDay);
  }
}

/**
 * Validate plan and fill any missing days
 */
function validateAndFillPlan(plan, totalDays, startDate, hoursPerDay) {
  const start = new Date(startDate);
  const validated = [];

  for (let i = 0; i < totalDays; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const dateStr = dayDate.toISOString().split("T")[0];

    const existing = plan.find((d) => d.day === i + 1) || plan[i];

    validated.push({
      day: i + 1,
      date: dateStr,
      topics: existing?.topics || [`Study Session ${i + 1}`],
      tasks: existing?.tasks || [
        `Review materials for day ${i + 1} (60 min)`,
        `Take notes and summarize (30 min)`,
        `Self-quiz on today's topics (30 min)`,
      ],
      hours: existing?.hours || hoursPerDay,
      focus: existing?.focus || (i >= totalDays - 2 ? "Revision" : "Study"),
      difficulty: existing?.difficulty || "medium",
    });
  }

  return validated;
}

/**
 * Fallback plan if LLM fails to generate valid JSON
 */
function generateFallbackPlan(keyTopics, totalDays, startDate, hoursPerDay) {
  const start = new Date(startDate);
  const plan = [];

  // Distribute topics across days (leave last day for revision)
  const studyDays = Math.max(1, totalDays - 1);
  const topicsPerDay = Math.ceil(keyTopics.length / studyDays);

  for (let i = 0; i < totalDays; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const dateStr = dayDate.toISOString().split("T")[0];

    const isLastDay = i === totalDays - 1;
    const topicStart = i * topicsPerDay;
    const dayTopics = isLastDay
      ? ["Full Revision", "Practice Questions"]
      : keyTopics.slice(topicStart, topicStart + topicsPerDay);

    plan.push({
      day: i + 1,
      date: dateStr,
      topics: dayTopics.length > 0 ? dayTopics : ["General Review"],
      tasks: isLastDay
        ? [
            "Review all topics quickly (45 min)",
            "Solve past exam questions (60 min)",
            "Identify and revisit weak areas (30 min)",
          ]
        : [
            `Study: ${dayTopics[0] || "Assigned topic"} (60 min)`,
            "Take detailed notes (30 min)",
            "Create summary flashcards (30 min)",
          ],
      hours: hoursPerDay,
      focus: isLastDay ? "Revision" : i === 0 ? "Foundation" : "Core Concepts",
      difficulty: isLastDay ? "hard" : i === 0 ? "easy" : "medium",
    });
  }

  return plan;
}

/**
 * Calculate days between two dates (inclusive of start, exclusive of end)
 */
export function calculateDaysUntilExam(examDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDateStr);
  exam.setHours(0, 0, 0, 0);

  const diffMs = exam - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}