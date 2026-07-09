CREATE INDEX idx_personal_documents_uploaded_by_created
    ON personal_documents(uploaded_by, created_at DESC);
