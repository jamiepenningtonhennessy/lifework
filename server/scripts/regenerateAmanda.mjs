/**
 * Trigger a full WOW Report regeneration for Amanda Lord (client 1149902).
 * This calls the internal runGenerationJob function directly, bypassing auth.
 * Run with: node --env-file=.env server/scripts/regenerateAmanda.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// We'll call the server's tRPC endpoint internally using a direct HTTP call
// with a special admin token, or use the internal function via tsx
// Since we can't import TS directly from .mjs, use tsx via child_process

import { execSync } from "child_process";

const script = `
import "dotenv/config";
import { runGenerationJob } from "../routers/wowReport.ts";

const CLIENT_ID = 1149902;
console.log("[regenerateAmanda] Starting full regeneration for client", CLIENT_ID);
await runGenerationJob(CLIENT_ID, "standard", "house");
console.log("[regenerateAmanda] Done.");
process.exit(0);
`;

import { writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpFile = join(__dirname, "_tmp_regenerate.ts");

writeFileSync(tmpFile, script);

try {
  execSync(`npx tsx ${tmpFile}`, { stdio: "inherit", cwd: join(__dirname, "../..") });
} finally {
  try { unlinkSync(tmpFile); } catch {}
}
