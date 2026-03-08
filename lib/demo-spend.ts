/**
 * Demo spend tracker — shuts off the AI chatbot once $25 in API credits
 * has been consumed across all users.
 *
 * Uses a single `app_config` key/value table in Turso (created on first use).
 * Costs are stored as integer cents to avoid floating-point drift.
 *
 * Claude Sonnet pricing (as of 2025):
 *   Input : $3.00 / 1M tokens
 *   Output: $15.00 / 1M tokens
 */

import { createClient } from '@libsql/client';

const INPUT_COST_PER_MTOK  = 3.00;   // USD per million input tokens
const OUTPUT_COST_PER_MTOK = 15.00;  // USD per million output tokens
export const DEMO_SPEND_LIMIT_CENTS = 1500; // $15.00

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

/** Ensure the app_config table exists and the spend row is initialised. */
async function ensureTable(client: ReturnType<typeof getClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_config (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await client.execute(
    `INSERT OR IGNORE INTO app_config (key, value) VALUES ('chat_spend_cents', '0')`
  );
}

/** Return current spend in cents. Returns 0 on any error (fail open). */
export async function getSpendCents(): Promise<number> {
  try {
    const client = getClient();
    await ensureTable(client);
    const result = await client.execute(
      `SELECT value FROM app_config WHERE key = 'chat_spend_cents'`
    );
    return parseInt((result.rows[0]?.value as string) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Returns true when the global demo AI budget is exhausted. */
export async function isAiDisabled(): Promise<boolean> {
  const spend = await getSpendCents();
  return spend >= DEMO_SPEND_LIMIT_CENTS;
}

/**
 * Add the cost of a Claude API call.
 * Call this AFTER a successful response — never before.
 */
export async function addApiUsage(
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const costCents = Math.ceil(
      (inputTokens  / 1_000_000) * INPUT_COST_PER_MTOK  * 100 +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_MTOK * 100
    );
    if (costCents === 0) return;

    const client = getClient();
    await ensureTable(client);
    await client.execute({
      sql: `
        UPDATE app_config
        SET value      = CAST(CAST(value AS INTEGER) + ? AS TEXT),
            updated_at = datetime('now')
        WHERE key = 'chat_spend_cents'
      `,
      args: [costCents],
    });
  } catch (err) {
    // Non-fatal — worst case we slightly overspend
    console.error('[demo-spend] Failed to record usage:', err);
  }
}

/** Human-readable spend summary for admin display. */
export async function getSpendSummary(): Promise<{
  spendCents: number;
  spendUsd: string;
  limitUsd: string;
  percentUsed: number;
  disabled: boolean;
}> {
  const spendCents = await getSpendCents();
  return {
    spendCents,
    spendUsd:    (spendCents / 100).toFixed(2),
    limitUsd:    (DEMO_SPEND_LIMIT_CENTS / 100).toFixed(2),
    percentUsed: Math.min(100, Math.round((spendCents / DEMO_SPEND_LIMIT_CENTS) * 100)),
    disabled:    spendCents >= DEMO_SPEND_LIMIT_CENTS,
  };
}
