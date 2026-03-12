import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "./analytics";
import { KNOWLEDGE_BASE_TABLE } from "./knowledge-base";

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

export type AnalyticsPromptLanguageGroup = {
  language: string;
  total: number;
  items: AnalyticsCount[];
};

export type AnalyticsAlert = {
  key: string;
  title: string;
  detail: string;
  tone: "emerald" | "amber" | "rose" | "slate";
  value?: string;
};

export type AnalyticsPromptExplorerRow = {
  id: string;
  createdAt: string;
  sessionId: string | null;
  language: string | null;
  source: string | null;
  promptPreview: string | null;
  promptLength: number | null;
  hostname: string | null;
  outcome: "success" | "error" | "retried" | "abandoned" | "pending";
  responseTimeMs: number | null;
};

export type AnalyticsFreshnessSummary = {
  totalChunks: number;
  sourceBreakdown: AnalyticsCount[];
  latestTelegramDate: string | null;
  latestTelegramPostId: string | null;
  latestTelegramUrl: string | null;
  uniqueTelegramPosts: number;
  uniqueYoutubeSources: number;
};

export type AnalyticsFunnelStep = {
  key: string;
  label: string;
  value: number;
  rateFromPrevious: number | null;
  rateFromStart: number | null;
};

export type AnalyticsDailyTrendPoint = {
  date: string;
  label: string;
  events: number;
  views: number;
  promptSubmits: number;
  firstResponses: number;
  responseErrors: number;
  averageResponseTimeMs: number | null;
};

export type AnalyticsRecentEvent = {
  id: string;
  createdAt: string;
  eventName: string;
  language: string | null;
  hostname: string | null;
  pagePath: string | null;
  source: string | null;
  errorType: string | null;
  responseTimeMs: number | null;
  messageCount: number | null;
  promptLength: number | null;
  promptPreview: string | null;
  linkUrl: string | null;
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
  topPrompts: AnalyticsCount[];
  promptLanguageBreakdown: AnalyticsPromptLanguageGroup[];
  errorTypes: AnalyticsCount[];
  dailyViews: AnalyticsCount[];
  alerts: AnalyticsAlert[];
  totalCitationClicks: number;
  citationDomains: AnalyticsCount[];
  topClickedSources: AnalyticsCount[];
  promptExplorer: AnalyticsPromptExplorerRow[];
  funnel: AnalyticsFunnelStep[];
  dailyTrend: AnalyticsDailyTrendPoint[];
  recentEvents: AnalyticsRecentEvent[];
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

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function getUrlHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildDailySeed(days: number): AnalyticsDailyTrendPoint[] {
  const points: AnalyticsDailyTrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const iso = date.toISOString().slice(0, 10);
    points.push({
      date: iso,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      events: 0,
      views: 0,
      promptSubmits: 0,
      firstResponses: 0,
      responseErrors: 0,
      averageResponseTimeMs: null,
    });
  }

  return points;
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
      .neq("event_name", "askalisher_share_payload")
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

type KnowledgeBaseRow = {
  source_type: string;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
};

export async function fetchKnowledgeBaseFreshness(): Promise<AnalyticsFreshnessSummary> {
  const supabase = getSupabaseServiceRoleClient();
  const rows: KnowledgeBaseRow[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(KNOWLEDGE_BASE_TABLE)
      .select("source_type, source_url, metadata")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data as KnowledgeBaseRow[] | null) ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  const sourceTypeMap = new Map<string, number>();
  const telegramPosts = new Set<string>();
  const youtubeSources = new Set<string>();
  let latestTelegramDate: string | null = null;
  let latestTelegramPostId: string | null = null;
  let latestTelegramUrl: string | null = null;

  for (const row of rows) {
    sourceTypeMap.set(row.source_type, (sourceTypeMap.get(row.source_type) || 0) + 1);

    if (row.source_type === "telegram_post") {
      const postUrl = row.source_url || (typeof row.metadata?.URL === "string" ? row.metadata.URL : null);
      if (postUrl) telegramPosts.add(postUrl);

      const nextDate = parseDateValue(row.metadata?.Date);
      if (nextDate && (!latestTelegramDate || nextDate > latestTelegramDate)) {
        latestTelegramDate = nextDate;
        latestTelegramPostId = typeof row.metadata?.["Post ID"] === "string" ? row.metadata["Post ID"] : null;
        latestTelegramUrl = postUrl;
      }
    }

    if (row.source_type === "youtube") {
      const youtubeUrl = row.source_url || (typeof row.metadata?.URL === "string" ? row.metadata.URL : null);
      if (youtubeUrl) youtubeSources.add(youtubeUrl);
    }
  }

  return {
    totalChunks: rows.length,
    sourceBreakdown: toSortedCounts(sourceTypeMap, 8),
    latestTelegramDate,
    latestTelegramPostId,
    latestTelegramUrl,
    uniqueTelegramPosts: telegramPosts.size,
    uniqueYoutubeSources: youtubeSources.size,
  };
}

export function buildAnalyticsSummary(rows: AnalyticsRow[], days: number): AnalyticsSummary {
  const uniqueSessions = new Set(rows.map((row) => row.session_id).filter(Boolean));
  const eventCounts = new Map<string, number>();
  const languages = new Map<string, number>();
  const hostnames = new Map<string, number>();
  const promptSources = new Map<string, number>();
  const topPrompts = new Map<string, number>();
  const promptLanguageMap = new Map<string, Map<string, number>>();
  const errorTypes = new Map<string, number>();
  const citationDomains = new Map<string, number>();
  const clickedSources = new Map<string, number>();
  const dailyViews = new Map<string, number>();
  const dailyTrend = buildDailySeed(days);
  const dailyTrendMap = new Map(dailyTrend.map((point) => [point.date, point]));
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  const dailyResponseTimeTotals = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    incrementCounter(eventCounts, row.event_name);
    incrementCounter(languages, row.language);
    incrementCounter(hostnames, row.hostname);
    const dayKey = row.created_at.slice(0, 10);
    const dayPoint = dailyTrendMap.get(dayKey);

    if (dayPoint) {
      dayPoint.events += 1;
    }

    if (row.event_name === "askalisher_view") {
      incrementCounter(dailyViews, row.created_at.slice(0, 10));
      if (dayPoint) dayPoint.views += 1;
    }

    if (row.event_name === "askalisher_prompt_submit") {
      incrementCounter(promptSources, typeof row.metadata?.source === "string" ? row.metadata.source : null);
      const promptPreview = typeof row.metadata?.prompt_preview === "string" ? row.metadata.prompt_preview : null;
      incrementCounter(topPrompts, promptPreview);

      if (promptPreview) {
        const promptLanguage = row.language || "unknown";
        const languageBucket = promptLanguageMap.get(promptLanguage) || new Map<string, number>();
        languageBucket.set(promptPreview, (languageBucket.get(promptPreview) || 0) + 1);
        promptLanguageMap.set(promptLanguage, languageBucket);
      }

      if (dayPoint) dayPoint.promptSubmits += 1;
    }

    if (row.event_name === "askalisher_response_error") {
      incrementCounter(errorTypes, typeof row.metadata?.error_type === "string" ? row.metadata.error_type : null);
      if (dayPoint) dayPoint.responseErrors += 1;
    }

    if (row.event_name === "askalisher_outbound_click") {
      incrementCounter(citationDomains, getUrlHost(typeof row.metadata?.link_url === "string" ? row.metadata.link_url : null));
      incrementCounter(
        clickedSources,
        typeof row.metadata?.link_text === "string"
          ? row.metadata.link_text
          : typeof row.metadata?.link_url === "string"
            ? row.metadata.link_url
            : null
      );
    }

    if (row.event_name === "askalisher_response_time" && typeof row.metadata?.response_time_ms === "number") {
      totalResponseTime += row.metadata.response_time_ms;
      responseTimeCount += 1;
      const existing = dailyResponseTimeTotals.get(dayKey) || { total: 0, count: 0 };
      existing.total += row.metadata.response_time_ms;
      existing.count += 1;
      dailyResponseTimeTotals.set(dayKey, existing);
    }

    if (row.event_name === "askalisher_first_response" && dayPoint) {
      dayPoint.firstResponses += 1;
    }
  }

  const promptSubmits = eventCounts.get("askalisher_prompt_submit") || 0;
  const firstResponses = eventCounts.get("askalisher_first_response") || 0;
  const responseErrors = eventCounts.get("askalisher_response_error") || 0;

  for (const point of dailyTrend) {
    const responseTime = dailyResponseTimeTotals.get(point.date);
    if (responseTime && responseTime.count > 0) {
      point.averageResponseTimeMs = Math.round(responseTime.total / responseTime.count);
    }
  }

  const recentEvents: AnalyticsRecentEvent[] = rows.slice(0, 40).map((row, index) => ({
    id: `${row.created_at}-${row.event_name}-${index}`,
    createdAt: row.created_at,
    eventName: row.event_name,
    language: row.language,
    hostname: row.hostname,
    pagePath: row.page_path,
    source: typeof row.metadata?.source === "string" ? row.metadata.source : null,
    errorType: typeof row.metadata?.error_type === "string" ? row.metadata.error_type : null,
    responseTimeMs: typeof row.metadata?.response_time_ms === "number" ? row.metadata.response_time_ms : null,
    messageCount: typeof row.metadata?.message_count === "number" ? row.metadata.message_count : null,
    promptLength: typeof row.metadata?.prompt_length === "number" ? row.metadata.prompt_length : null,
    promptPreview: typeof row.metadata?.prompt_preview === "string" ? row.metadata.prompt_preview : null,
    linkUrl: typeof row.metadata?.link_url === "string" ? row.metadata.link_url : null,
  }));

  const funnel: AnalyticsFunnelStep[] = [
    {
      key: "views",
      label: "Views",
      value: eventCounts.get("askalisher_view") || 0,
      rateFromPrevious: null,
      rateFromStart: null,
    },
    {
      key: "prompt_submits",
      label: "Prompt submits",
      value: promptSubmits,
      rateFromPrevious: (eventCounts.get("askalisher_view") || 0) > 0 ? (promptSubmits / (eventCounts.get("askalisher_view") || 1)) * 100 : null,
      rateFromStart: (eventCounts.get("askalisher_view") || 0) > 0 ? (promptSubmits / (eventCounts.get("askalisher_view") || 1)) * 100 : null,
    },
    {
      key: "first_responses",
      label: "First responses",
      value: firstResponses,
      rateFromPrevious: promptSubmits > 0 ? (firstResponses / promptSubmits) * 100 : null,
      rateFromStart: (eventCounts.get("askalisher_view") || 0) > 0 ? (firstResponses / (eventCounts.get("askalisher_view") || 1)) * 100 : null,
    },
  ];

  const promptLanguageBreakdown: AnalyticsPromptLanguageGroup[] = [...promptLanguageMap.entries()]
    .map(([language, items]) => ({
      language,
      total: [...items.values()].reduce((sum, value) => sum + value, 0),
      items: toSortedCounts(items, 4),
    }))
    .sort((a, b) => b.total - a.total);

  const rowsBySession = new Map<string, AnalyticsRow[]>();
  for (const row of rows) {
    const key = row.session_id || "unknown";
    const bucket = rowsBySession.get(key) || [];
    bucket.push(row);
    rowsBySession.set(key, bucket);
  }

  const promptExplorer: AnalyticsPromptExplorerRow[] = [];
  for (const [sessionId, sessionRows] of rowsBySession.entries()) {
    const ordered = [...sessionRows].sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (let index = 0; index < ordered.length; index += 1) {
      const row = ordered[index];
      if (row.event_name !== "askalisher_prompt_submit") continue;

      const nextPromptIndex = ordered.findIndex(
        (candidate, candidateIndex) => candidateIndex > index && candidate.event_name === "askalisher_prompt_submit"
      );
      const segment = ordered.slice(index + 1, nextPromptIndex === -1 ? ordered.length : nextPromptIndex);
      const successEvent = segment.find((item) => item.event_name === "askalisher_response_time");
      const errorEvent = segment.find((item) => item.event_name === "askalisher_response_error");
      const retryEvent = segment.find((item) => item.event_name === "askalisher_retry_click");
      const newChatEvent = segment.find((item) => item.event_name === "askalisher_new_chat");
      let outcome: AnalyticsPromptExplorerRow["outcome"] = "pending";

      if (successEvent) {
        outcome = "success";
      } else if (errorEvent) {
        outcome = "error";
      } else if (retryEvent) {
        outcome = "retried";
      } else if (newChatEvent) {
        outcome = "abandoned";
      }

      promptExplorer.push({
        id: `${sessionId}-${row.created_at}-${index}`,
        createdAt: row.created_at,
        sessionId: row.session_id,
        language: row.language,
        source: typeof row.metadata?.source === "string" ? row.metadata.source : null,
        promptPreview: typeof row.metadata?.prompt_preview === "string" ? row.metadata.prompt_preview : null,
        promptLength: typeof row.metadata?.prompt_length === "number" ? row.metadata.prompt_length : null,
        hostname: row.hostname,
        outcome,
        responseTimeMs:
          typeof successEvent?.metadata?.response_time_ms === "number"
            ? successEvent.metadata.response_time_ms
            : typeof errorEvent?.metadata?.response_time_ms === "number"
              ? errorEvent.metadata.response_time_ms
              : null,
      });
    }
  }

  promptExplorer.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const latestDay = dailyTrend[dailyTrend.length - 1] ?? null;
  const priorDays = dailyTrend.slice(0, -1);
  const priorLatencyAverage = average(
    priorDays
      .map((point) => point.averageResponseTimeMs)
      .filter((value): value is number => typeof value === "number" && value > 0)
  );
  const priorResponseRateAverage = average(
    priorDays
      .filter((point) => point.promptSubmits > 0)
      .map((point) => (point.firstResponses / point.promptSubmits) * 100)
  );
  const alerts: AnalyticsAlert[] = [];

  if (latestDay) {
    if (latestDay.averageResponseTimeMs && priorLatencyAverage) {
      if (latestDay.averageResponseTimeMs > Math.max(6000, priorLatencyAverage * 1.5)) {
        alerts.push({
          key: "latency_spike",
          title: "Latency spike",
          detail: `${latestDay.label} is averaging ${latestDay.averageResponseTimeMs} ms vs ${Math.round(priorLatencyAverage)} ms across earlier days.`,
          tone: latestDay.averageResponseTimeMs > Math.max(9000, priorLatencyAverage * 2) ? "rose" : "amber",
          value: `${latestDay.averageResponseTimeMs} ms`,
        });
      }
    }

    if (latestDay.promptSubmits > 0) {
      const latestResponseRate = (latestDay.firstResponses / latestDay.promptSubmits) * 100;

      if (priorResponseRateAverage !== null && latestResponseRate < priorResponseRateAverage - 20) {
        alerts.push({
          key: "response_rate_drop",
          title: "Response-rate drop",
          detail: `${latestDay.label} is converting ${latestResponseRate.toFixed(1)}% of prompts into first responses vs ${priorResponseRateAverage.toFixed(1)}% previously.`,
          tone: latestResponseRate < 60 ? "rose" : "amber",
          value: `${latestResponseRate.toFixed(1)}%`,
        });
      }

      if (latestDay.firstResponses === 0) {
        alerts.push({
          key: "no_first_responses",
          title: "Prompts without replies",
          detail: `${latestDay.label} has prompt traffic but no tracked first responses yet.`,
          tone: "rose",
          value: `${latestDay.promptSubmits} prompt${latestDay.promptSubmits === 1 ? "" : "s"}`,
        });
      }
    }

    if (latestDay.responseErrors > 0) {
      alerts.push({
        key: "response_errors",
        title: "Response errors detected",
        detail: `${latestDay.responseErrors} response error event${latestDay.responseErrors === 1 ? "" : "s"} appeared on ${latestDay.label}.`,
        tone: latestDay.responseErrors >= 3 ? "rose" : "amber",
        value: String(latestDay.responseErrors),
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      key: "no_major_anomalies",
      title: "No major anomalies",
      detail: "Latest latency, response conversion, and error rates are within the normal range for this window.",
      tone: uniqueSessions.size > 0 ? "emerald" : "slate",
    });
  }

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
    topPrompts: toSortedCounts(topPrompts, 6),
    promptLanguageBreakdown,
    errorTypes: toSortedCounts(errorTypes, 5),
    dailyViews: toSortedCounts(dailyViews, days),
    alerts,
    totalCitationClicks: eventCounts.get("askalisher_outbound_click") || 0,
    citationDomains: toSortedCounts(citationDomains, 6),
    topClickedSources: toSortedCounts(clickedSources, 8),
    promptExplorer: promptExplorer.slice(0, 80),
    funnel,
    dailyTrend,
    recentEvents,
  };
}
