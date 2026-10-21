const QUESTIONS = [[
  "Role understanding", "Summarise your understanding of this role and why it interests you."
], [
  "Relevant experience", "Describe the most relevant project you delivered for a similar role."
], [
  "Problem solving", "Tell me about a difficult technical or business problem you solved. What was your approach?"
], [
  "Quality", "How do you ensure the quality and reliability of your work?"
], [
  "Collaboration", "Describe a disagreement with a stakeholder or colleague and how you resolved it."
], [
  "Ownership", "Tell me about a time a delivery was at risk. What actions did you personally take?"
], [
  "Learning", "Describe a technology or domain you had to learn quickly and how you became effective."
], [
  "Closing", "What questions do you have about the role, team, or organisation?"
]];

export function validate(input) {
  const errors = [];
  if (!input?.jobTitle?.trim()) errors.push("Job title is required.");
  if (!input?.jobDescription?.trim() || input.jobDescription.trim().length < 80) errors.push("Job description must contain at least 80 characters.");
  const duration = Number(input?.durationMinutes);
  if (!Number.isFinite(duration) || duration < 15 || duration > 120) errors.push("Duration must be between 15 and 120 minutes.");
  return errors;
}

export function validateSchedule(input) {
  const errors = [];
  if (!input?.candidateName?.trim()) errors.push("Candidate name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input?.candidateEmail || ""))) errors.push("A valid candidate email is required.");
  const start = Date.parse(input?.startDateTime);
  const end = Date.parse(input?.endDateTime);
  if (!Number.isFinite(start)) errors.push("A valid start date and time is required.");
  if (!Number.isFinite(end)) errors.push("A valid end date and time is required.");
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) errors.push("End time must be after start time.");
  if (Number.isFinite(start) && Number.isFinite(end) && end - start > 120 * 60 * 1000) errors.push("Interview duration cannot exceed 120 minutes.");
  if (!input?.timeZone?.trim()) errors.push("Time zone is required.");
  return errors;
}

export function fallbackPlan(input) {
  return {
    jobTitle: input.jobTitle.trim(), durationMinutes: Number(input.durationMinutes), language: "English", mode: "Transcript only",
    questions: QUESTIONS.map(([competency, question], i) => ({ id: i + 1, competency, question, weight: i === 7 ? 0 : i < 3 ? 20 : 10, followUpRule: "Ask one follow-up only when the answer lacks a concrete example, action, or outcome." })),
    scoringScale: { 1: "No relevant evidence", 2: "Limited evidence; significant gaps", 3: "Relevant evidence at the expected level", 4: "Strong evidence with clear ownership and outcomes", 5: "Exceptional evidence, depth, trade-offs, and measurable impact" },
    prohibitedTopics: ["age", "health", "disability", "family status", "religion", "ethnicity", "sexual orientation"], generatedBy: "deterministic-fallback"
  };
}

function esc(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
export function inviteBody(i) {
  return `<p>You are invited to interview for <strong>${esc(i.jobTitle)}</strong>.</p><p><strong>AI disclosure:</strong> A clearly identified AI Interviewer will ask pre-approved, job-related questions. A transcript will be created; audio and video will not be retained.</p><p>Your answers will be summarised for a human recruiter. AI will not make the final hiring decision. Contact the recruiter before the meeting to request a human-led interview or accessibility adjustment.</p><p>You will be asked to confirm consent before transcription begins.</p>`;
}
export function assessment(plan, transcript) {
  const text = String(transcript || "").trim();
  return { status: "DRAFT_REQUIRES_HUMAN_REVIEW", jobTitle: plan.jobTitle, generatedAt: new Date().toISOString(), transcriptCharacters: text.length, evidence: text.split(/\n+/).filter(Boolean).slice(0, 8).map((x, i) => ({ questionId: plan.questions[i]?.id ?? null, excerpt: x.slice(0, 500) })), instruction: "A recruiter must review the transcript, validate evidence, enter scores, and approve or reject this draft. No automated hiring decision has been made." };
}
