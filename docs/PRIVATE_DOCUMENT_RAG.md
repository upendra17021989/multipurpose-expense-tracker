# Private document assistant

Private document RAG supports one explicitly selected PDF, TXT or Markdown document per question. It does not search all documents automatically. Image OCR and scanned PDF OCR are not implemented.

## Enable and use

Set `CHAT_DOCUMENTS_ENABLED=true` alongside the existing `CHAT_ENABLED`, `CHAT_AI_ENABLED`, `OPENAI_API_KEY` and `CHAT_MODEL` configuration, then restart the backend. The feature defaults to disabled. Normal Flyway startup applies `V60__Private_Document_Rag.sql`. Verify this migration on staging PostgreSQL before deployment.

In the assistant, select **Private document**, choose a document, and check the consent box before **Enable indexing / retry**. Only the uploader can enable or disable indexing. This consent permits extracted text to be sent to the configured AI provider for embeddings and answers. Existing uploads are never automatically enrolled. Users with current document sharing access can ask questions after the owner's index is ready, but cannot enable or disable it.

The active workspace must be an active individual account owned by the authenticated user. Retrieval uses the document service's uploader/shared-user access semantics. The source document's account must also be active. Identity comes from authentication, never request-body user/account IDs.

## Ingestion and lifecycle

An explicit enable request creates a durable `QUEUED` job. A scheduled worker claims one job per instance, extracts text and embeds batches of at most 16 chunks. States are `NOT_INDEXED`, `QUEUED`, `PROCESSING`, `READY` and `FAILED`. Jobs left processing for more than 15 minutes become failed; owners can retry. Row locks prevent duplicate claims across instances. Provider calls run outside database transactions.

Extraction accepts at most 5 MiB, 100 PDF pages, 200,000 extracted characters and 100 chunks per document. Chunks contain at most 3,000 characters and carry page/part metadata. The application's existing upload limit (1 MiB by default) still applies. Text files must be valid UTF-8. Empty text, unreadable PDFs, unsupported formats and extraction/provider failures produce a generic failed status without retaining provider error bodies.

The index stores extracted text, vectors, a SHA-256 hash of the file's Base64 representation and embedding model in a separate private table. Treat that table and its backups as private document data. Indexes are never mixed into the public help corpus. Changing embedding models uses lexical excerpt fallback until the owner reindexes.

Disabling indexing deletes its stored text and vectors. Deleting the document cascades index deletion in the database. Replacing a file through **Edit document** or the file API removes the old index and revokes consent; the replacement requires explicit opt-in again. Generation IDs stop cancelled, replaced or deleted jobs from publishing late results. Old files are retired after a successful replacement transaction; new files are removed on rollback.

Question-time access and consent checks use fresh scalar database queries before provider calls and again before returning a result. Revoked access or consent prevents returning an in-flight answer. A request already sent to the provider cannot be recalled. Responses requests disable application-level provider storage with `store: false`; this does not establish the provider's entire retention policy.

## API

All routes require normal JWT authentication under `/api`:

- `GET /personal/documents/{id}/rag`: indexing status.
- `POST /personal/documents/{id}/rag`: `{"consent":true}`; returns HTTP 202 and queues indexing.
- `DELETE /personal/documents/{id}/rag`: uploader revokes consent and deletes index.
- `POST /personal/documents/{id}/rag/ask`: `{"message":"What is the policy premium?"}`.
- `PUT /personal/documents/{id}/file`: multipart `file`; uploader replaces content and invalidates indexing.

Questions are limited to 2,000 characters and use the assistant's existing per-user rate limit and concurrency semaphore. Answers cite up to three document page/part references. AI/provider failures return clearly labeled authorized excerpts when possible. Missing or invalid indexes require reindexing; no matching evidence returns an abstention. Documents and questions are untrusted evidence and cannot trigger tools or writes.

## Verification

Run targeted tests from `backend`:

```powershell
mvn.cmd '-Dtest=DocumentRagControllerTest,DocumentRagAccessQueryTest,DocumentRagMigrationTest,PrivateDocumentRagServiceTest,DocumentTextExtractorTest,PersonalDocumentServiceTest,PersonalDocumentHardeningTest,ChatServiceTest,ChatControllerTest,HelpKnowledgeServiceTest,MarkdownHelpLoaderTest,OpenAiRagClientTest' test
```

From `frontend`:

```powershell
npm.cmd test -- src/pages/Assistant.test.jsx src/pages/DocumentAssistant.test.jsx
npm.cmd run build
```

Tests use mock provider calls and isolated H2 databases; they do not establish live provider connectivity or staging PostgreSQL behavior. On staging, use a synthetic PDF/text file to verify explicit consent, queue completion, grounded page citations, owner/shared/unrelated-user access, revoked sharing, disable/delete/replacement during ingestion, provider outages and failed-job retry. Monitor private text storage, provider usage and ingestion latency before broader rollout. Multi-instance shared rate limiting and daily cost budgets remain future work.

Implementation validation: 51 targeted backend tests and 12 frontend component tests passed, and the frontend production build passed. The V60 foreign key/cascade test runs against isolated H2, not staging PostgreSQL.
