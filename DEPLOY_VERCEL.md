# Deploy Frontend on Vercel

The frontend is a Vite React app in `frontend/`.

## Vercel Project Settings

Use these settings when importing the repo:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Environment Variables

Set this in Vercel:

```text
VITE_API_BASE_URL=https://your-render-backend.onrender.com/api
```

Example:

```text
VITE_API_BASE_URL=https://expense-tracker-backend.onrender.com/api
```

## Render CORS

After Vercel gives you a frontend URL, add it to the Render backend env var:

```text
APP_CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
```

Redeploy the Render backend after changing CORS.

## Notes

- `frontend/vercel.json` keeps React Router routes working on refresh.
- The app still works as a normal website.
- PWA files are served from `public/` and included in Vercel builds.
