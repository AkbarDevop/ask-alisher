import { fetchAnalyticsRows, filterDashboardAnalyticsRows } from "@/lib/analytics-report";

function escapeCsv(value: string | number | null | undefined): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function getDaysParam(raw: string | null): number {
  const requestedDays = Number(raw || "7");
  if (!Number.isFinite(requestedDays)) return 7;
  return Math.min(Math.max(Math.round(requestedDays), 1), 30);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const providedKey = url.searchParams.get("key") || "";
  const expectedKey = process.env.ANALYTICS_DASHBOARD_KEY || "";

  if (!expectedKey || providedKey !== expectedKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const days = getDaysParam(url.searchParams.get("days"));
  const rows = filterDashboardAnalyticsRows(await fetchAnalyticsRows(days));

  const header = [
    "created_at",
    "event_name",
    "language",
    "hostname",
    "page_path",
    "source",
    "prompt_preview",
    "prompt_length",
    "response_time_ms",
    "error_type",
    "message_count",
    "link_url",
  ];

  const lines = rows.map((row) =>
    [
      row.created_at,
      row.event_name,
      row.language,
      row.hostname,
      row.page_path,
      typeof row.metadata?.source === "string" ? row.metadata.source : null,
      typeof row.metadata?.prompt_preview === "string" ? row.metadata.prompt_preview : null,
      typeof row.metadata?.prompt_length === "number" ? row.metadata.prompt_length : null,
      typeof row.metadata?.response_time_ms === "number" ? row.metadata.response_time_ms : null,
      typeof row.metadata?.error_type === "string" ? row.metadata.error_type : null,
      typeof row.metadata?.message_count === "number" ? row.metadata.message_count : null,
      typeof row.metadata?.link_url === "string" ? row.metadata.link_url : null,
    ]
      .map((value) => escapeCsv(value))
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ask-alisher-analytics-${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
