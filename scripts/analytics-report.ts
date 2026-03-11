import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "../src/lib/analytics";
import { loadLocalEnv, parseCliArgs } from "./lib/ingestion-utils";

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type AnalyticsRow = {
  created_at: string;
  event_name: string;
  session_id: string | null;
  language: string | null;
  hostname: string | null;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
};

function incrementCounter(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function formatTop(map: Map<string, number>, limit = 5): string {
  const pairs = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (pairs.length === 0) return "none";
  return pairs.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

async function fetchRows(days: number): Promise<AnalyticsRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows: AnalyticsRow[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(ASK_ALISHER_ANALYTICS_TABLE)
      .select("created_at, event_name, session_id, language, hostname, page_path, metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data as AnalyticsRow[] | null) ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function main() {
  const args = parseCliArgs();
  const days = Number(args.days || 7);

  if (!Number.isFinite(days) || days <= 0) {
    console.error("Invalid --days value");
    process.exit(1);
  }

  const rows = await fetchRows(days);
  const uniqueSessions = new Set(rows.map((row) => row.session_id).filter(Boolean));
  const eventCounts = new Map<string, number>();
  const languages = new Map<string, number>();
  const hostnames = new Map<string, number>();
  const promptSources = new Map<string, number>();
  const errorTypes = new Map<string, number>();
  const dailyViews = new Map<string, number>();
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  for (const row of rows) {
    incrementCounter(eventCounts, row.event_name);
    incrementCounter(languages, row.language);
    incrementCounter(hostnames, row.hostname);

    if (row.event_name === "askalisher_view") {
      incrementCounter(dailyViews, row.created_at.slice(0, 10));
    }

    if (row.event_name === "askalisher_prompt_submit") {
      incrementCounter(promptSources, typeof row.metadata?.source === "string" ? row.metadata.source : null);
    }

    if (row.event_name === "askalisher_response_error") {
      incrementCounter(errorTypes, typeof row.metadata?.error_type === "string" ? row.metadata.error_type : null);
    }

    if (row.event_name === "askalisher_response_time" && typeof row.metadata?.response_time_ms === "number") {
      totalResponseTime += row.metadata.response_time_ms;
      responseTimeCount += 1;
    }
  }

  const promptSubmits = eventCounts.get("askalisher_prompt_submit") || 0;
  const firstResponses = eventCounts.get("askalisher_first_response") || 0;
  const responseErrors = eventCounts.get("askalisher_response_error") || 0;

  console.log(`Ask Alisher analytics summary — last ${days} day(s)\n`);
  console.log(`Events: ${rows.length}`);
  console.log(`Unique sessions: ${uniqueSessions.size}`);
  console.log(`Prompt submits: ${promptSubmits}`);
  console.log(`First responses: ${firstResponses}`);
  console.log(`Response errors: ${responseErrors}`);
  console.log(
    `First-response rate: ${promptSubmits > 0 ? `${((firstResponses / promptSubmits) * 100).toFixed(1)}%` : "n/a"}`
  );
  console.log(
    `Error rate: ${promptSubmits > 0 ? `${((responseErrors / promptSubmits) * 100).toFixed(1)}%` : "n/a"}`
  );
  console.log(
    `Average response time: ${responseTimeCount > 0 ? `${Math.round(totalResponseTime / responseTimeCount)} ms` : "n/a"}`
  );
  console.log(`Top events: ${formatTop(eventCounts, 8)}`);
  console.log(`Languages: ${formatTop(languages, 5)}`);
  console.log(`Hostnames: ${formatTop(hostnames, 5)}`);
  console.log(`Prompt sources: ${formatTop(promptSources, 5)}`);
  console.log(`Error types: ${formatTop(errorTypes, 5)}`);
  console.log(`Views by day: ${formatTop(dailyViews, days)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
