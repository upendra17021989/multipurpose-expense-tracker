# Deploy Backend on Render

This repo includes a Render blueprint in `render.yaml` for the Spring Boot backend only.
Use your existing Supabase PostgreSQL database for persistence.

## Steps

1. Push the repository to GitHub.
2. In Render, create a new **Blueprint** from the repository.
3. Render will create `expense-tracker-backend`.
4. In the Render service environment, set your Supabase database variables:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://<supabase-host>:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=<supabase-user>
SPRING_DATASOURCE_PASSWORD=<supabase-password>
```

5. Set `APP_CORS_ALLOWED_ORIGINS` after your frontend is deployed.

Example:

```text
https://your-frontend-domain.com,http://localhost:5173
```

The backend URL will be:

```text
https://expense-tracker-backend.onrender.com/api
```

## Important Notes

- Render provides `PORT`; the backend now uses it automatically.
- Flyway runs migrations on startup against Supabase.
- Uploaded files use `/tmp/expense-tracker-uploads` on Render. This is ephemeral storage, so use S3 or another persistent file store before production use.
- Keep `APP_JWT_SECRET` private. The blueprint generates it for new services.
