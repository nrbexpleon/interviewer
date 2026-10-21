import test from "node:test";
import assert from "node:assert/strict";
import { fallbackPlan, validate, validateSchedule } from "../src/interview.mjs";

test("job description validation rejects insufficient input", () => {
  assert.deepEqual(validate({ jobTitle: "", jobDescription: "short", durationMinutes: 5 }), [
    "Job title is required.",
    "Job description must contain at least 80 characters.",
    "Duration must be between 15 and 120 minutes."
  ]);
});

test("fallback plan remains job-related and human reviewed", () => {
  const plan = fallbackPlan({ jobTitle: "C++ Developer", durationMinutes: 60 });
  assert.equal(plan.jobTitle, "C++ Developer");
  assert.equal(plan.questions.length, 8);
  assert.ok(plan.prohibitedTopics.includes("age"));
  assert.equal(plan.generatedBy, "deterministic-fallback");
});

test("schedule validation checks identity and time boundaries", () => {
  const valid = { candidateName: "Test Candidate", candidateEmail: "candidate@example.test", startDateTime: "2026-10-22T10:00:00Z", endDateTime: "2026-10-22T11:00:00Z", timeZone: "UTC" };
  assert.deepEqual(validateSchedule(valid), []);
  assert.ok(validateSchedule({ ...valid, candidateEmail: "bad" }).includes("A valid candidate email is required."));
  assert.ok(validateSchedule({ ...valid, endDateTime: valid.startDateTime }).includes("End time must be after start time."));
  assert.ok(validateSchedule({ ...valid, endDateTime: "2026-10-22T13:01:00Z" }).includes("Interview duration cannot exceed 120 minutes."));
});
