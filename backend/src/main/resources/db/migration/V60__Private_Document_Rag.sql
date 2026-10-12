CREATE TABLE personal_document_rag (
    document_id BIGINT PRIMARY KEY REFERENCES personal_documents(id) ON DELETE CASCADE,
    generation VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    content_hash VARCHAR(64),
    embedding_model VARCHAR(100),
    chunks_json TEXT,
    error VARCHAR(200),
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX personal_document_rag_status_idx ON personal_document_rag(status);
