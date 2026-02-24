export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const API_HOST =
  (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(
    /\/api\/?$/,
    ""
  );
