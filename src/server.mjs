import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.mjs";
import { assessment, fallbackPlan, inviteBody, validate, validateSchedule } from "./interview.mjs";
import { accessToken, assertRequestTenant, loadConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = loadConfig();
const store = new Store(path.resolve(config.dataDir.startsWith(".") ? path.join(root, config.dataDir) : config.dataDir));
await store.init();
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function body(req) {
  let value = "";
  for await (const chunk of req) { value += chunk; if (value.length > 1000000) throw Object.assign(new Error("Request too large"), { status: 413 }); }
  try { return value ? JSON.parse(value) : {}; }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 }); }
}
function send(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "same-origin" });
  res.end(JSON.stringify(value));
}

async function generatePlan(input) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const key = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !deployment || !key) return fallbackPlan(input);
  const version = process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview";
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(version)}`;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "api-key": key }, body: JSON.stringify({
    temperature: 0.2, response_format: { type: "json_object" }, messages: [
      { role: "system", content: "Create a fair, job-related English interview plan as JSON with jobTitle, durationMinutes, language, mode, questions, scoringScale, and prohibitedTopics. Use 8 to 10 questions. Each question needs id, competency, question, weight, and followUpRule. Never ask about protected characteristics. Final decisions require human review." },
      { role: "user", content: JSON.stringify(input) }
    ]
  }) });
  if (!response.ok) throw new Error(`Azure OpenAI plan generation failed with status ${response.status}.`);
  const payload = await response.json();
  return { ...JSON.parse(payload.choices[0].message.content), generatedBy: "azure-openai" };
}

async function graphEvent(token, interview) {
  const event = {
    subject: `AI Interview - ${interview.jobTitle}`,
    body: { contentType: "HTML", content: inviteBody(interview) },
    start: { dateTime: interview.startDateTime, timeZone: interview.timeZone },
    end: { dateTime: interview.endDateTime, timeZone: interview.timeZone },
    attendees: [{ emailAddress: { address: interview.candidateEmail, name: interview.candidateName }, type: "required" }],
    isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness", allowNewTimeProposals: true
  };
  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(event) });
  if (!response.ok) throw new Error(`Microsoft Graph scheduling failed with status ${response.status}.`);
  return response.json();
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { status: "ok", service: "AI Interviewer", time: new Date().toISOString(), environment: config.safeMetadata() });
  if (url.pathname.startsWith("/api/")) assertRequestTenant(req.headers, config);

  if (req.method === "POST" && url.pathname === "/api/interviews/plan") {
    const input = await body(req); const errors = validate(input);
    if (errors.length) return send(res, 400, { errors });
    const plan = await generatePlan(input);
    return send(res, 201, await store.create({ status: "PLAN_CREATED", input, plan, audit: [{ at: new Date().toISOString(), action: "PLAN_CREATED" }] }));
  }
  const match = url.pathname.match(/^\/api\/interviews\/([a-f0-9-]+)(?:\/(schedule|transcript|approve))?$/i);
  if (match && req.method === "GET" && !match[2]) return send(res, 200, await store.get(match[1]));
  if (match && req.method === "POST" && match[2] === "schedule") {
    const record = await store.get(match[1]); const input = await body(req); const errors = validateSchedule(input);
    if (errors.length) return send(res, 400, { errors });
    const token = accessToken(req.headers);
    if (!token && !config.allowMockGraph) return send(res, 401, { error: "Microsoft Graph delegated token missing. Sign in through App Service Authentication." });
    const event = token ? await graphEvent(token, { ...input, jobTitle: record.plan.jobTitle }) : { id: `mock-${Date.now()}`, webLink: "#mock", onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/mock" }, note: "Mock event only" };
    Object.assign(record, { candidate: input, graphEvent: event, status: "SCHEDULED" }); record.audit.push({ at: new Date().toISOString(), action: "MEETING_SCHEDULED", graphEventId: event.id }); await store.save(record); return send(res, 200, record);
  }
  if (match && req.method === "POST" && match[2] === "transcript") {
    const record = await store.get(match[1]); const input = await body(req);
    if (input.consentConfirmed !== true) return send(res, 400, { error: "Candidate consent must be confirmed before transcript processing." });
    record.consentConfirmed = true; record.transcript = String(input.transcript || ""); record.assessment = assessment(record.plan, record.transcript); record.status = "REVIEW_REQUIRED"; record.audit.push({ at: new Date().toISOString(), action: "TRANSCRIPT_PROCESSED", consentConfirmed: true }); await store.save(record); return send(res, 200, record);
  }
  if (match && req.method === "POST" && match[2] === "approve") {
    const record = await store.get(match[1]); const input = await body(req); if (!input.reviewerName?.trim()) return send(res, 400, { error: "Reviewer name is required." }); record.status = "HUMAN_REVIEW_COMPLETED"; record.humanReview = { reviewerName: input.reviewerName.trim(), notes: String(input.notes || ""), at: new Date().toISOString() }; record.audit.push({ at: record.humanReview.at, action: "HUMAN_REVIEW_COMPLETED", reviewerName: record.humanReview.reviewerName }); await store.save(record); return send(res, 200, record);
  }
  if (req.method === "GET") {
    const file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, ""); const target = path.join(root, "public", path.normalize(file));
    if (!target.startsWith(path.join(root, "public"))) return send(res, 403, { error: "Forbidden" });
    try { const content = await readFile(target); res.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream", "x-content-type-options": "nosniff", "referrer-policy": "same-origin" }); return res.end(content); } catch { return send(res, 404, { error: "Not found" }); }
  }
  return send(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => route(req, res).catch(error => { console.error(error); send(res, error.status || 500, { error: error.message || "Unexpected error" }); }));
server.listen(config.port, "0.0.0.0", () => console.log(`AI Interviewer listening on http://0.0.0.0:${config.port} (${config.deploymentMode}/${config.dataMode})`));
