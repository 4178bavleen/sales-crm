/// <reference types="vite/client" />

/**
 * Environment variables exposed to the client.
 *
 * Only `VITE_`-prefixed vars reach the browser (Vite inlines them at build
 * time), so this is the complete set the dashboard may read.
 *
 * `VITE_API_URL` is intentionally NOT given a default here: the base URL lives
 * only in `.env`, and `src/lib/endpoints.ts` throws at startup if it is missing
 * rather than silently pointing at a guessed host.
 */
interface ImportMetaEnv {
  /** Base URL of the Sales CRM API, e.g. http://localhost:5000/api/v1 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
