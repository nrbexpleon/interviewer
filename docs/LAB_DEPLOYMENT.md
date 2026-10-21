# Lab-tenant deployment gate

This MVP is approved only for isolated development testing with synthetic data. It must not be connected to the Expleo production tenant or used with real candidate data.

## Required lab services

- Microsoft 365 lab tenant
- Licensed test users with Exchange Online calendars
- Microsoft Teams meeting capability
- Lab-tenant Entra application registration
- Azure App Service and Azure OpenAI test resources

An Azure free trial does not itself provide Microsoft 365, Exchange Online, or Teams licences.

## Entra application

1. Register a single-tenant application named `AI Interviewer Dev` in the lab tenant.
2. Add `https://APP_NAME.azurewebsites.net/.auth/login/aad/callback` as a web redirect URI.
3. Add delegated Graph permissions: `User.Read`, `Calendars.ReadWrite`, and `OnlineMeetings.ReadWrite`.
4. Grant administrator consent in the lab tenant according to lab policy.
5. Record the lab tenant ID and application client ID for the Bicep deployment.

## Deployment

Deploy `infra/main.bicep` with the lab tenant ID and Entra client ID. The template enables App Service Authentication, requires authentication, returns HTTP 401 for unauthenticated requests, enables the token store, configures Graph login scopes, and sets these safety controls:

- `DEPLOYMENT_MODE=lab`
- `DATA_MODE=synthetic`
- `AUTH_TENANT_ID=<lab tenant>`
- `ALLOWED_TENANT_ID=<lab tenant>`
- `BLOCKED_TENANT_IDS=<production tenant>`
- `ALLOW_MOCK_GRAPH=false`

The application also validates the authenticated App Service principal tenant on every non-health API request.

## Verification before use

- `npm test` passes.
- `/api/health` reports `lab`, `synthetic`, mock Graph disabled, and tenant restriction configured.
- An unauthenticated request receives HTTP 401 from App Service Authentication.
- A lab test user can create an event in a lab mailbox and a lab Teams meeting.
- A user from any other tenant is rejected.
- Only fictional job descriptions, candidates, addresses, transcripts, and assessments are used.
- No audio or video is recorded.
- Human review remains mandatory.

## Not covered

This deployment is not approval for production, real recruitment data, autonomous interviewing, candidate ranking/rejection, recording, ATS integration, or a real-time Teams media bot.
