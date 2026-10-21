# Expleo AI Interviewer - Development MVP

Dependency-free Node.js MVP for Outlook, Teams meetings, Microsoft Graph, Azure OpenAI, and mandatory recruiter review.

## Implemented

- JD validation and English interview-plan generation
- Azure OpenAI integration with deterministic local fallback
- Human plan approval before scheduling
- Microsoft Graph calendar event and Teams meeting creation
- External candidate invitations with AI and transcript disclosure
- Consent-gated transcript processing and evidence extraction
- Mandatory human-review status and audit records
- Azure App Service infrastructure for Central India
- Lab-tenant startup and authenticated-principal enforcement
- Synthetic-data-only guard and explicit production-tenant block

## Excluded from this MVP

- Autonomous real-time voice or media bot
- Audio or video recording
- Automatic candidate ranking, rejection, or hiring
- Production ATS integration
- Expleo production-tenant and real-candidate use

## Local run

Copy `.env.example` to `.env`, load the values, and run:

```sh
npm test
node src/server.mjs
```

Open `http://localhost:3000`. Local mode defaults to synthetic data. `ALLOW_MOCK_GRAPH=true` creates an explicitly marked mock event.

## Lab deployment

Use a Microsoft 365 lab tenant with licensed Exchange Online and Teams test users. An Azure free trial alone does not provide those Microsoft 365 services. Follow [docs/LAB_DEPLOYMENT.md](docs/LAB_DEPLOYMENT.md).

Deploy `infra/main.bicep` through the approved pipeline with the lab tenant ID and lab Entra client ID. The template configures App Service Authentication, HTTP 401 for unauthenticated requests, the Easy Auth token store, delegated Graph login scopes, and application-level tenant restrictions.

## Entra and Microsoft Graph lab steps

1. Register a single-tenant app named `AI Interviewer Dev` in the lab tenant.
2. Add `https://APP_NAME.azurewebsites.net/.auth/login/aad/callback` as a web redirect URI.
3. Add delegated Graph permissions: `User.Read`, `Calendars.ReadWrite`, and `OnlineMeetings.ReadWrite`.
4. Grant administrator consent according to lab-tenant policy.
5. Supply the lab tenant ID and client ID to the Bicep deployment.
6. Verify external attendees are permitted by the lab Teams policies before using an external fictional address.

## Deployment gates before any candidate pilot

- HR, Privacy/DPO, Legal, Information Security, AI governance, and accessibility approval
- Country-specific approval for recruitment AI and transcription
- Approved retention and deletion schedule
- Role-based access and encrypted durable storage
- Bias, accessibility, prompt-injection, and data-leakage testing
- Candidate notice, consent, and human-led alternative
- Incident response and audit monitoring

This MVP is a development baseline, not approval to process live candidate data.
