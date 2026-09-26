import { getStore } from '@netlify/blobs';

// One JSON document per day with aggregate counters only: no IP address, no content,
// no identifiers. It powers the daily AI cap and the pilot usage statistics.
// Read-modify-write without locking: under heavy parallel load a few increments can be
// lost, which is acceptable for a soft cap and approximate statistics.

export interface DayUsage {
  aiCalls: number;
  roleplayTurns: number;
  analyses: number;
  capHits: number;
  sessions: Record<string, number>;
}

const DAILY_LIMIT = Number(process.env.DAILY_AI_LIMIT) || 3000;
const KNOWN_SCENARIOS = new Set(['repair-shock', 'maint-upgrade', 'second-opinion', 'system-replacement']);

const store = () => getStore({ name: 'usage', consistency: 'strong' });

// Days roll over at midnight Florida time, not UTC.
export const dayKey = (d = new Date()) =>
  d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const empty = (): DayUsage => ({ aiCalls: 0, roleplayTurns: 0, analyses: 0, capHits: 0, sessions: {} });

async function read(key: string): Promise<DayUsage> {
  const data = (await store().get(key, { type: 'json' })) as Partial<DayUsage> | null;
  return { ...empty(), ...(data ?? {}) };
}

export const CAP_MESSAGE =
  "Today's AI practice capacity has been used up. It resets at midnight (Eastern time). Base Camp still works without limits.";

/**
 * Reserve one AI call for today. Returns false when the daily cap is reached.
 * The call is counted before the model runs, so failed or abusive requests still count.
 */
export async function reserveCall(kind: 'roleplay' | 'analysis', scenario?: string, isSessionStart = false): Promise<boolean> {
  try {
    return await reserve(kind, scenario, isSessionStart);
  } catch (err) {
    // Fail open: a storage outage must not take the training tool down with it.
    console.error('usage counter unavailable', err instanceof Error ? err.message : err);
    return true;
  }
}

async function reserve(kind: 'roleplay' | 'analysis', scenario: string | undefined, isSessionStart: boolean): Promise<boolean> {
  const key = dayKey();
  const u = await read(key);
  if (u.aiCalls >= DAILY_LIMIT) {
    u.capHits += 1;
    await store().setJSON(key, u);
    return false;
  }
  u.aiCalls += 1;
  if (kind === 'roleplay') u.roleplayTurns += 1;
  else u.analyses += 1;
  if (isSessionStart) {
    // Only the four built-in scenario ids are recorded; everything else counts as "custom".
    const id = scenario && KNOWN_SCENARIOS.has(scenario) ? scenario : 'custom';
    u.sessions[id] = (u.sessions[id] ?? 0) + 1;
  }
  await store().setJSON(key, u);
  return true;
}

export async function recentUsage(days: number): Promise<Record<string, DayUsage>> {
  const out: Record<string, DayUsage> = {};
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(now - i * 86400000));
    const data = await store().get(key, { type: 'json' });
    if (data) out[key] = { ...empty(), ...(data as Partial<DayUsage>) };
  }
  return out;
}

export const dailyLimit = DAILY_LIMIT;
