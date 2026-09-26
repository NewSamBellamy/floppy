// Public Supabase values only. Never put a service-role key or Gemini key here.
// Set these when the Supabase project has been provisioned and the migration applied.
const injected=globalThis.__FLOPPY_CLOUD_CONFIG__||{};
export const CLOUD_URL = injected.url||'';
export const CLOUD_PUBLISHABLE_KEY = injected.publishableKey||'';
