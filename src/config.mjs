const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function value(env, name) {
  return String(env[name] || "").trim();
}

function guid(env, name, required = false) {
  const result = value(env, name);
  if (!result && !required) return "";
  if (!GUID.test(result)) throw new Error(`${name} must be a valid GUID.`);
  return result.toLowerCase();
}

export function loadConfig(env = process.env) {
  const deploymentMode = value(env, "DEPLOYMENT_MODE") || "local";
  const dataMode = value(env, "DATA_MODE") || "synthetic";
  if (!["local", "lab"].includes(deploymentMode)) {
    throw new Error("DEPLOYMENT_MODE must be local or lab. Production use is not approved.");
  }
  if (dataMode !== "synthetic") {
    throw new Error("Only DATA_MODE=synthetic is permitted in this development MVP.");
  }

  const authTenantId = guid(env, "AUTH_TENANT_ID", deploymentMode === "lab");
  const allowedTenantId = guid(env, "ALLOWED_TENANT_ID", deploymentMode === "lab");
  const blockedTenantIds = new Set(
    value(env, "BLOCKED_TENANT_IDS").split(",").map(x => x.trim().toLowerCase()).filter(Boolean)
  );
  for (const tenantId of blockedTenantIds) {
    if (!GUID.test(tenantId)) throw new Error("BLOCKED_TENANT_IDS must contain comma-separated GUIDs.");
  }
  if (deploymentMode === "lab" && authTenantId !== allowedTenantId) {
    throw new Error("AUTH_TENANT_ID must exactly match ALLOWED_TENANT_ID in lab mode.");
  }
  if (allowedTenantId && blockedTenantIds.has(allowedTenantId)) {
    throw new Error("The allowed tenant is explicitly blocked from development use.");
  }

  return {
    port: Number(env.PORT || 3000),
    dataDir: value(env, "DATA_DIR") || "./data",
    deploymentMode,
    dataMode,
    authTenantId,
    allowedTenantId,
    blockedTenantIds,
    allowMockGraph: value(env, "ALLOW_MOCK_GRAPH") === "true",
    safeMetadata() {
      return {
        deploymentMode,
        dataMode,
        mockGraphEnabled: this.allowMockGraph,
        tenantRestrictionConfigured: Boolean(allowedTenantId)
      };
    }
  };
}

function decodePrincipal(encoded) {
  try {
    return JSON.parse(Buffer.from(String(encoded), "base64").toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid App Service authentication principal."), { status: 401 });
  }
}

function principalTenant(principal) {
  const claims = Array.isArray(principal?.claims) ? principal.claims : [];
  return String(claims.find(claim =>
    claim?.typ === "tid" || String(claim?.typ || "").endsWith("/tenantid")
  )?.val || "").toLowerCase();
}

export function assertRequestTenant(headers, config) {
  if (config.deploymentMode !== "lab") return;
  const encoded = headers["x-ms-client-principal"];
  if (!encoded) {
    throw Object.assign(new Error("Authenticated lab-tenant identity is required."), { status: 401 });
  }
  const tenantId = principalTenant(decodePrincipal(encoded));
  if (!tenantId || tenantId !== config.allowedTenantId || config.blockedTenantIds.has(tenantId)) {
    throw Object.assign(new Error("The authenticated identity is not from the approved lab tenant."), { status: 403 });
  }
}

export function accessToken(headers) {
  const easyAuthToken = headers["x-ms-token-aad-access-token"];
  if (easyAuthToken) return String(easyAuthToken);
  const match = String(headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
