let current;
const find = selector => document.querySelector(selector);
const showStatus = message => { find("#status").textContent = message || ""; };
async function post(url, value) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || (data.errors && data.errors.join(" ")) || "Request failed");
  return data;
}
function renderQuestion(q, i) { return document.createTextNode((i + 1) + ". " + q.competency + ": " + q.question); }
find("#plan-form").addEventListener("submit", async event => {
event.preventDefault(); showStatus(""); const button = event.submitter; button.disabled = true;
try { current = await post("/api/interviews/plan", Object.fromEntries(new FormData(event.target)));
find("#result-title").textContent = current.plan.jobTitle; find("#questions").textContent = "";
current.plan.questions.forEach((q, i) => find("#questions").append(renderQuestion(q, i), document.createElement("br")));
find("#plan-result").classList.remove("hidden"); } catch (error) { showStatus(error.message); } button.disabled = false; });
find("#continue").addEventListener("click", () => find("#schedule-card").classList.remove("hidden"));
find("#schedule-form").addEventListener("submit", async event => {
event.preventDefault(); const button = event.submitter; button.disabled = true;
try { const input = Object.fromEntries(new FormData(event.target)); current = await post("/api/interviews/" + current.id + "/schedule", input);
find("#done-message").textContent = "Invitation prepared for " + input.candidateName + " (" + input.candidateEmail + " ).";
find("#event-link").href = current.graphEvent.webLink || "#"; find("#done").classList.remove("hidden"); } catch (error) { showStatus(error.message); } button.disabled = false; });
