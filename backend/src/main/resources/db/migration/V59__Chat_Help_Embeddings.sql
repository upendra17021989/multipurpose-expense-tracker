-- Public site-help vectors only; private documents need a separate authorized index.
CREATE TABLE chat_help_embeddings (
    id VARCHAR(64) PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL,
    model VARCHAR(100) NOT NULL,
    vector_json TEXT NOT NULL
);
