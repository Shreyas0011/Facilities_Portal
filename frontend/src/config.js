// VITE_API_URL is set via:
//   - frontend/.env.production (committed, used by Vercel build)
//   - Vercel Dashboard → Settings → Environment Variables (takes priority)
//   - frontend/.env (local dev only, gitignored)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://facility-portal-backend.onrender.com/api';
