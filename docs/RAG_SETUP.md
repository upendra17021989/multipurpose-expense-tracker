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

Edit reviewed Markdown files in `backend/src/main/resources/chat/markdown/`. The allowlist `backend/src/main/resources/chat/markdown.json` maps each file to a stable document ID, display title and internal application route. Only listed, packaged files are loaded; repository documentation, arbitrary URLs and uploaded private documents are not scanned.

Use ATX headings (`# Title`, `## Section`) to divide topics. Each non-empty heading body becomes a chunk; long bodies split at newline/space boundaries where possible, with a 4,000-character maximum. Fenced code headings remain content. Single-chunk documents retain their document ID; multi-chunk IDs derive from document ID, heading and part number. Use distinct heading text within each file: duplicate chunk IDs fail startup. Source titles include the document title and section heading, and source links use the reviewed application route.

Files must have a lowercase filename using letters, digits and hyphens with a `.md` extension, with no directories. Each file is limited to 128 KiB and the complete corpus to 100 chunks. Empty files, invalid manifest entries and duplicate IDs fail startup. Validate text against actual application behavior and never include credentials or private records. Redeploy to load changes. Changed chunk content triggers re-embedding; removed chunks are immediately excluded from retrieval even if residual cache rows remain. Existing help content has been migrated from JSON to Markdown.

## Verification

Backend tests use mocked provider HTTP calls plus an isolated in-memory database for aggregation tests. No paid AI calls are made:

```powershell
cd backend
mvn.cmd '-Dtest=MarkdownHelpLoaderTest,HelpKnowledgeServiceTest,ChatServiceTest,PersonalExpenseSummaryServiceTest,OpenAiRagClientTest,ChatControllerTest,ChatExpenseQueryTest' test
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
