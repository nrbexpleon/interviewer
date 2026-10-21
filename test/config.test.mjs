import test from "node:test";
import assert from "node:assert/strict";
import { accessToken, assertRequestTenant, loadConfig } from "../src/config.mjs";

const LAB = "11111111-1111-4111-8111-111111111111";
const PROD = "3b0e7247-e0d5-44bf-8ed1-d01b18d16ca2";

test("local synthetic mode is the safe default", () => {
  const config = loadConfig({});
  assert.equal(config.deploymentMode, "local");
  assert.equal(config.dataMode, "synthetic");
});

test("production mode is rejected", () => {
  assert.throws(() => loadConfig({ DEPLOYMENT_MODE: "production" }), /Production use is not approved/);
});

test("lab mode requires matching tenant configuration", () => {
  assert.throws(() => loadConfig({ DEPLOYMENT_MODE: "lab", DATA_MODE: "synthetic" }), /AUTH_TENANT_ID/);
  assert.throws(() => loadConfig({ DEPLOYMENT_MODE: "lab", DATA_MODE: "synthetic", AUTH_TENANT_ID: LAB, ALLOWED_TENANT_ID: PROD }), /must exactly match/);
});

test("blocked production tenant cannot be allowed", () => {
  assert.throws(() => loadConfig({ DEPLOYMENT_MODE: "lab", DATA_MODE: "synthetic", AUTH_TENANT_ID: PROD, ALLOWED_TENANT_ID: PROD, BLOCKED_TENANT_IDS: PROD }), /explicitly blocked/);
});

test("lab request must contain the approved tenant claim", () => {
  const config = loadConfig({ DEPLOYMENT_MODE: "lab", DATA_MODE: "synthetic", AUTH_TENANT_ID: LAB, ALLOWED_TENANT_ID: LAB, BLOCKED_TENANT_IDS: PROD });
  assert.throws(() => assertRequestTenant({}, config), /identity is required/);
  const principal = Buffer.from(JSON.stringify({ claims: [{ typ: "tid", val: LAB }] })).toString("base64");
  assert.doesNotThrow(() => assertRequestTenant({ "x-ms-client-principal": principal }, config));
  const wrong = Buffer.from(JSON.stringify({ claims: [{ typ: "tid", val: PROD }] })).toString("base64");
  assert.throws(() => assertRequestTenant({ "x-ms-client-principal": wrong }, config), /not from the approved lab tenant/);
});

test("delegated access token extraction supports Easy Auth and Bearer", () => {
  assert.equal(accessToken({ "x-ms-token-aad-access-token": "easy" }), "easy");
  assert.equal(accessToken({ authorization: "Bearer delegated" }), "delegated");
  assert.equal(accessToken({}), "");
});
