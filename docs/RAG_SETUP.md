# Site assistant setup

## What is implemented

Signed-in users can open `/assistant` or click **Ask assistant**. The first release retrieves reviewed site-help sections with sources. The owner of an active individual workspace can also request a selected month's personal expense summary, including category totals. Totals use account-scoped SQL aggregates and decimal arithmetic. Draft, submitted, approved and paid entries are included; rejected/deleted entries are excluded. Shared expenses, bank balances, and unrecorded spending are outside this summary.

The default mode is **Help search**: matching help excerpts, without AI calls. AI-enabled mode uses OpenAI embeddings, persisted vectors and cosine retrieval before calling the Responses API. If indexing or generation fails, the response is explicitly labeled as a search fallback. Unknown questions can return no evidence. No private documents or expense records are sent to OpenAI.

## Enable AI

Set these backend environment variables using your deployment's secret/configuration manager, then restart the backend:

```text
CHAT_ENABLED=true
CHAT_AI_ENABLED=true
OPENAI_API_KEY=<server-side secret>
CHAT_MODEL=<Responses-compatible text model available in your OpenAI project>
CHAT_EMBEDDING_MODEL=text-embedding-3-small
CHAT_TIMEOUT_SECONDS=20
```

`CHAT_MODEL` deliberately has no default. Select a supported model in your provider project according to your budget and evaluate its grounded answers. Keep the key out of frontend variables and source control. The implementation uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text) and [embeddings API](https://developers.openai.com/api/docs/guides/embeddings). Responses requests set `store: false`; this does not by itself define the provider's entire data-retention policy.

The first AI help request embeds missing/changed help sections in one batch and persists the vectors; subsequent requests reuse them. Content hashes and embedding model IDs invalidate stale entries. Indexing is lazy rather than performed during startup, so startup makes no provider calls. The model cannot invoke tools or modify application data. No framework upgrade is required.

Normal application startup runs Flyway migration `V59__Chat_Help_Embeddings.sql`. It creates a cache table using ordinary PostgreSQL types. pgvector is not required for this small initial collection; the index is bounded to 100 reviewed sections. Existing database migration privileges are required. Migration and live provider connectivity have not been validated against a deployed environment.

## APIs

Under the application's normal `/api` context, JWT authentication is required:

- `GET /api/chat/status`: `enabled` and `aiConfigured`, never credentials.
- `POST /api/chat`: `{"mode":"HELP","message":"How do I import expenses?"}`.
- `POST /api/chat`: `{"mode":"EXPENSE_SUMMARY","month":"2026-10"}`.

Identity/account IDs come from the authenticated principal, not from request fields. Personal summaries recheck account ownership, type and active status before querying. Site help contains no account-specific records. A missing month defaults to the current month in Asia/Kolkata; the UI sends an explicit selection. Each help request is self-contained; displayed history is not model context.

## Update the knowledge collection

Edit `backend/src/main/resources/chat/help.json`. Each entry is one short help section with a stable unique ID, title, reviewed text and an internal route. Validate text against actual application behavior and never include credentials or private records. Redeploy to load the new collection. Changed text triggers re-embedding; removed sections are immediately excluded from retrieval even if residual cache rows remain. Only the current curated collection can be retrieved from this cache.

## Verification

Backend tests use mocked provider HTTP calls plus an isolated in-memory database for aggregation tests. No paid AI calls are made:

```powershell
cd backend
mvn.cmd '-Dtest=HelpKnowledgeServiceTest,ChatServiceTest,PersonalExpenseSummaryServiceTest,OpenAiRagClientTest,ChatControllerTest,ChatExpenseQueryTest' test
```

Frontend component tests and desktop/mobile browser tests:

```powershell
cd frontend
npm.cmd test -- src/pages/Assistant.test.jsx
npm.cmd run test:e2e -- assistant.spec.js --workers=1
npm.cmd run build
```

The installed test dependencies require a newer runtime than Node 22.0.0. Use a compatible Node 22 release. A temporary runner, without changing project dependencies, is:

```powershell
npm.cmd exec --yes --package=node@22 -- node node_modules/vitest/vitest.mjs run src/pages/Assistant.test.jsx
```

Before production rollout, configure the provider and run a live smoke test for help answers, restart/cache reuse, current-account summary permissions, provider outage behavior, and the migration on a staging PostgreSQL database.

## Limits and next phases

Set `CHAT_ENABLED=false` to disable requests. Each instance permits 10 chat requests per user per minute and 4 concurrent requests, with no queue. Provider calls have configurable timeouts clamped to 5–60 seconds, a 5-second connect timeout and an 800-token answer limit. Requests accept at most 2,000 question characters. Multi-instance deployments need a shared limiter and daily provider budget controls before broad rollout.

Conversation history is held only in page memory, bounded to 19 exchanges, and clears on account/token changes, locking or leaving the page. It is not persisted. Sources list retrieved evidence; citations are generated by the model and do not guarantee every claim is correct. Review representative answers before enabling AI broadly. Private document ingestion/OCR, pgvector, other-module live queries, streaming and write actions are future work, tracked in [the implementation plan](RAG_IMPLEMENTATION_PLAN.md).
