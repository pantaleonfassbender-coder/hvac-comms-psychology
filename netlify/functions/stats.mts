import type { Context } from '@netlify/functions';
import { recentUsage, dailyLimit } from '../lib/usage.mts';

// Owner-only pilot statistics: GET /api/stats?key=<STATS_KEY>[&days=30][&format=csv]
// Returns aggregate daily counters only. Without a configured STATS_KEY the endpoint does not exist.
export default async (req: Request, _context: Context) => {
  const expected = process.env.STATS_KEY;
  const url = new URL(req.url);
  if (!expected || url.searchParams.get('key') !== expected) {
    return new Response('Not Found', { status: 404 });
  }

  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 366);
  const usage = await recentUsage(days);
  const dates = Object.keys(usage).sort();

  const totals = { aiCalls: 0, roleplayTurns: 0, analyses: 0, capHits: 0, sessions: {} as Record<string, number> };
  for (const d of dates) {
    const u = usage[d];
    totals.aiCalls += u.aiCalls;
    totals.roleplayTurns += u.roleplayTurns;
    totals.analyses += u.analyses;
    totals.capHits += u.capHits;
    for (const [k, v] of Object.entries(u.sessions)) totals.sessions[k] = (totals.sessions[k] ?? 0) + v;
  }

  if (url.searchParams.get('format') === 'csv') {
    const ids = [...new Set(dates.flatMap((d) => Object.keys(usage[d].sessions)))].sort();
    const rows = [['date', 'ai_calls', 'roleplay_turns', 'analyses', 'cap_hits', ...ids.map((i) => `sessions_${i}`)].join(',')];
    for (const d of dates) {
      const u = usage[d];
      rows.push([d, u.aiCalls, u.roleplayTurns, u.analyses, u.capHits, ...ids.map((i) => u.sessions[i] ?? 0)].join(','));
    }
    return new Response(rows.join('\n') + '\n', {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  return Response.json({ dailyLimit, days, totals, byDay: usage }, { headers: { 'Cache-Control': 'no-store' } });
};

export const config = {
  path: '/api/stats',
};
