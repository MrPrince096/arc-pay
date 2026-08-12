/**
 * Loads `.env` (if present) into `process.env` before anything else runs.
 * Uses Node's built-in `loadEnvFile` (no `dotenv` dependency needed — added
 * Node 20.6+, this project targets Node 22). `.env` is optional (the RPC
 * connectivity check and dashboard need no keys at all), so a missing file
 * is silently ignored; only import this, don't call it — the side effect on
 * import is the point.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env file — fine, everything that needs a key already handles absence gracefully.
}
