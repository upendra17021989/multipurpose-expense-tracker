# RAG assistant implementation plan

## Phase 1 — site help and personal expense summaries

- [x] Add an authenticated `/chat` endpoint with bounded inputs, request limits, and timeouts.
- [x] Create a reviewed help collection with internal source links; never ingest repository secrets or arbitrary URLs.
- [x] Persist content-versioned embeddings and retrieve relevant help sections before generating answers.
- [x] Integrate OpenAI embeddings and Responses through server-side HTTP, without upgrading Spring Boot.
- [x] Support explicit help-search mode when AI is not configured or the provider is unavailable.
- [x] Calculate personal expense summaries in backend queries, enforce active account ownership, and return date/status scope.
- [x] Add a mobile-friendly assistant page with sources, loading/errors, and workspace-isolated session history.
- [x] Verify retrieval, authorization, exact totals, provider contracts/failures, and frontend lifecycle behavior.

Phase 1 implementation is complete. On 2026-10-12, 25 targeted backend tests, 8 component tests, and 3 browser tests passed. Desktop/mobile previews were inspected. Provider contracts use mocks and the aggregation test uses isolated H2; live provider and staging PostgreSQL checks remain deployment prerequisites. The frontend production build passed.

## Phase 2 — private documents

Markdown help ingestion is implemented separately from private document ingestion: reviewed classpath files are explicitly allowlisted, split by ATX headings into bounded chunks and retrieved through the existing embedding cache and lexical fallback. Existing help content has been migrated to Markdown. This does not enable uploaded private document retrieval.

Extract approved personal documents (PDF/text first), split sections with page metadata, and add document-level authorization to both indexing and retrieval. Recheck sharing permissions immediately before model access. Include replacement/deletion handling, content hashes, background ingestion, retry status, and extraction size limits. Scanned PDF OCR is a separate enhancement. Do not upload existing private documents automatically.

## Phase 3 — scale and other modules

Move vector search into pgvector after confirming hosting support. Add SQL-level authorization filters and indexes, evaluate hybrid retrieval, and expand live tools to society/kirana/festival services with their actual role checks. Add shared rate limits, daily budgets, latency/cost monitoring, feedback, and a curated evaluation set before broad rollout.

## Phase 1 design decisions

- Corpus is small, public app-help content only. Reviewed Markdown files are allowlisted in a JSON manifest and split by headings into bounded chunks. No private financial records are embedded or sent to OpenAI.
- PostgreSQL stores vectors as JSON text; Java performs exact cosine comparison over this bounded collection. No database extension or framework upgrade is required for this milestone.
- Help requests are stateless. Conversation history is display-only in the browser, cleared on workspace/session changes; follow-up questions should be self-contained.
- Expense summary is an explicit chat mode with a selected month; amounts come from account-scoped SQL aggregates using decimal arithmetic, not an LLM.
- AI is opt-in via environment variables. Missing configuration and provider failures produce labeled search results, not simulated AI answers.
- Per-user limits and concurrency limits are per process for the MVP. Use a shared limiter for multi-instance production deployments.
- Private document retrieval, OCR, persistent conversation history, streaming, and write actions are deferred to later phases.

## Acceptance and rollout

Run targeted backend and frontend tests plus the frontend production build. Confirm unauthenticated chat is denied; another account and non-personal accounts cannot run personal summaries; deleted/rejected entries are excluded and returned scope is explicit. Confirm changed content/model invalidates cached vectors, unrelated questions abstain, provider output is handled safely, and delayed responses cannot populate a new workspace session. Live provider and deployed-database smoke tests require operator configuration; mock tests do not establish live connectivity.

Ship under `CHAT_ENABLED`. Start with a small group, review grounded answers and timings, then expand scope. See `RAG_SETUP.md` for configuration and remaining operational checks.
