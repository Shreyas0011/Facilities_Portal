// Centralized API base URL.
// Set VITE_API_URL in your .env file.
// Fallback keeps local dev working without any .env change.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
