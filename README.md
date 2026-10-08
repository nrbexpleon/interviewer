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

## Excluded from this MVP

- Autonomous real-time voice or media bot
- Audio or video recording
- Automatic candidate ranking, rejection, or hiring
- Production ATS integration

## Local run

Copy .env.example to .env, load the values, and run: node src/server.mjs
Open http://localhost:3000. ALLOW_MOCK_GRAPH=true creates an explicitly marked mock event.

## Azure deployment

Deploy infra/main.bicep with Azure CLI or your approved pipeline. Supply appName, azureOpenAiEndpoint, azureOpenAiDeployment, and azureOpenAiApiKey as secure deployment parameters. Then ZIP package.json, src, and public and deploy the ZIP to the created App Service.

## Entra and Microsoft Graph administrator steps

1. Register a single-tenant app named AI Interviewer Dev.
2. Add https://APP_NAME.azurewebsites.net/.auth/login/aad/callback as a web redirect URI.
3. Add delegated Graph permissions: User.Read, Calendars.ReadWrite, OnlineMeetings.ReadWrite.
4. Grant administrator consent according to tenant policy.
5. Enable App Service Authentication with Microsoft as provider, require authentication, and enable token store.
6. Configure Graph scopes so App Service supplies X-MS-TOKEN-AAD-ACCESS-TOKEN.
7. Verify external attendees are permitted by Teams meeting and external-access policies.

## Deployment gates before a candidate pilot

- HR, Privacy/DPO, Legal, Information Security, AI governance, and accessibility approval
- Country-specific approval for recruitment AI and transcription
- Approved retention and deletion schedule
- Role-based access and encrypted durable storage
- Bias, accessibility, prompt-injection, and data-leakage testing
- Candidate notice, consent, and human-led alternative
- Incident response and audit monitoring

This MVP is a development baseline, not approval to process live candidate data.
