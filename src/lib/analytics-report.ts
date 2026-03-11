import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "./analytics";

export type AnalyticsRow = {
  created_at: string;
  event_name: string;
  session_id: string | null;
  language: string | null;
  hostname: string | null;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
};

export type AnalyticsCount = {
  key: string;
  value: number;
};

export type AnalyticsSummary = {
  days: number;
  totalEvents: number;
  uniqueSessions: number;
  promptSubmits: number;
  firstResponses: number;
  responseErrors: number;
  firstResponseRate: number | null;
  errorRate: number | null;
  averageResponseTimeMs: number | null;
  topEvents: AnalyticsCount[];
  languages: AnalyticsCount[];
  hostnames: AnalyticsCount[];
  promptSources: AnalyticsCount[];
  errorTypes: AnalyticsCount[];
  dailyViews: AnalyticsCount[];
};

function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function incrementCounter(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function toSortedCounts(map: Map<string, number>, limit = 5): AnalyticsCount[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

export async function fetchAnalyticsRows(days: number): Promise<AnalyticsRow[]> {
  const supabase = getSupabaseServiceRoleClient();
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

export function buildAnalyticsSummary(rows: AnalyticsRow[], days: number): AnalyticsSummary {
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

  return {
    days,
    totalEvents: rows.length,
    uniqueSessions: uniqueSessions.size,
    promptSubmits,
    firstResponses,
    responseErrors,
    firstResponseRate: promptSubmits > 0 ? (firstResponses / promptSubmits) * 100 : null,
    errorRate: promptSubmits > 0 ? (responseErrors / promptSubmits) * 100 : null,
    averageResponseTimeMs: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : null,
    topEvents: toSortedCounts(eventCounts, 8),
    languages: toSortedCounts(languages, 5),
    hostnames: toSortedCounts(hostnames, 5),
    promptSources: toSortedCounts(promptSources, 5),
    errorTypes: toSortedCounts(errorTypes, 5),
    dailyViews: toSortedCounts(dailyViews, days),
  };
}
