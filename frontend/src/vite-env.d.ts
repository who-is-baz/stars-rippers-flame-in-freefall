/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_LLM_URL?: string;
  readonly VITE_API_URL?: string;       // alias of VITE_LLM_URL (backend base URL, no /api)
  readonly VITE_LLM_TIMEOUT_MS?: string; // default 15000
  readonly VITE_BASE?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
