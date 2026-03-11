import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  buildAnalyticsSummary,
  fetchAnalyticsRows,
  type AnalyticsCount,
  type AnalyticsDailyTrendPoint,
  type AnalyticsFunnelStep,
  type AnalyticsRecentEvent,
} from "@/lib/analytics-report";

export const metadata: Metadata = {
  title: "Ask Alisher Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    key?: string | string[];
    days?: string | string[];
  }>;
};

const DONUT_COLORS = ["#155dfc", "#0f766e", "#f59e0b", "#e11d48", "#7c3aed"];
const TREND_SERIES = [
  { key: "views", label: "Views", color: "#155dfc" },
  { key: "promptSubmits", label: "Prompts", color: "#0f766e" },
  { key: "firstResponses", label: "First responses", color: "#f59e0b" },
  { key: "responseErrors", label: "Errors", color: "#e11d48" },
] as const;

function getSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatPercent(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function formatMillis(value: number | null): string {
  return value === null ? "n/a" : `${value.toLocaleString("en-US")} ms`;
}

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatEventName(name: string): string {
  return name
    .replace(/^askalisher_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenHostname(hostname: string | null): string {
  if (!hostname) return "unknown";
  return hostname.replace(".netlify.app", "");
}

function buildDaysHref(key: string, days: number): string {
  return `/admin/analytics?key=${encodeURIComponent(key)}&days=${days}`;
}

function getPointValue(
  point: AnalyticsDailyTrendPoint,
  key: (typeof TREND_SERIES)[number]["key"]
): number {
  if (key === "views") return point.views;
  if (key === "promptSubmits") return point.promptSubmits;
  if (key === "firstResponses") return point.firstResponses;
  return point.responseErrors;
}

function SectionShell({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {accent}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone: "blue" | "teal" | "amber" | "rose";
}) {
  const tones = {
    blue: "from-blue-500/14 to-blue-100/20 text-blue-700",
    teal: "from-teal-500/14 to-teal-100/20 text-teal-700",
    amber: "from-amber-500/14 to-amber-100/20 text-amber-700",
    rose: "from-rose-500/14 to-rose-100/20 text-rose-700",
  };

  return (
    <div className={`rounded-[1.75rem] border border-white/70 bg-gradient-to-br ${tones[tone]} p-5 shadow-sm`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function TrendChart({ points }: { points: AnalyticsDailyTrendPoint[] }) {
  const width = 720;
  const height = 280;
  const left = 42;
  const right = 14;
  const top = 14;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => TREND_SERIES.map((series) => getPointValue(point, series.key)))
  );

  const buildPath = (key: (typeof TREND_SERIES)[number]["key"]) =>
    points
      .map((point, index) => {
        const x = left + (points.length === 1 ? plotWidth / 2 : (plotWidth / (points.length - 1)) * index);
        const value = getPointValue(point, key);
        const y = top + plotHeight - (value / maxValue) * plotHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = top + plotHeight - tick * plotHeight;
          const value = Math.round(maxValue * tick);
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
              <text x={10} y={y + 4} fill="#94a3b8" fontSize="11">
                {value}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const x = left + (points.length === 1 ? plotWidth / 2 : (plotWidth / (points.length - 1)) * index);
          return (
            <text
              key={point.date}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
            >
              {point.label}
            </text>
          );
        })}

        {TREND_SERIES.map((series) => (
          <path
            key={series.key}
            d={buildPath(series.key)}
            fill="none"
            stroke={series.color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {TREND_SERIES.map((series) =>
          points.map((point, index) => {
            const x = left + (points.length === 1 ? plotWidth / 2 : (plotWidth / (points.length - 1)) * index);
            const value = getPointValue(point, series.key);
            const y = top + plotHeight - (value / maxValue) * plotHeight;
            return (
              <circle
                key={`${series.key}-${point.date}`}
                cx={x}
                cy={y}
                r="3"
                fill={series.color}
                stroke="white"
                strokeWidth="1.5"
              >
                <title>{`${series.label}: ${value} on ${point.label}`}</title>
              </circle>
            );
          })
        )}
      </svg>

      <div className="mt-4 flex flex-wrap gap-3">
        {TREND_SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
            <span>{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponseTimeBars({ points }: { points: AnalyticsDailyTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.map((point) => point.averageResponseTimeMs ?? 0));

  return (
    <div className="flex h-64 items-end gap-3">
      {points.map((point) => {
        const value = point.averageResponseTimeMs ?? 0;
        const heightPercent = value > 0 ? Math.max(8, (value / maxValue) * 100) : 6;
        return (
          <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-52 w-full items-end">
              <div
                className="w-full rounded-t-2xl bg-gradient-to-t from-amber-500 to-yellow-300"
                style={{ height: `${heightPercent}%`, opacity: value > 0 ? 1 : 0.18 }}
                title={value > 0 ? `${point.label}: ${value} ms` : `${point.label}: no data`}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{point.label}</p>
              <p className="text-xs text-slate-600">{value > 0 ? `${value} ms` : "n/a"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({ items }: { items: AnalyticsCount[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.key}>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-medium text-slate-700">{formatEventName(item.key)}</span>
            <span className="text-slate-500">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: index % 2 === 0 ? "linear-gradient(90deg, #155dfc, #60a5fa)" : "linear-gradient(90deg, #0f766e, #2dd4bf)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  items,
  emptyLabel,
}: {
  items: AnalyticsCount[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <div className="relative mx-auto h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {items.map((item, index) => {
            const length = (item.value / total) * circumference;
            const strokeDasharray = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={item.key}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              >
                <title>{`${item.key}: ${item.value}`}</title>
              </circle>
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">{total}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">events</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.key} className="flex items-center justify-between gap-6 text-sm">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                />
                <span className="max-w-44 truncate text-slate-700">{item.key}</span>
              </div>
              <span className="whitespace-nowrap text-slate-500">{item.value} · {share.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunnelChart({ steps }: { steps: AnalyticsFunnelStep[] }) {
  const max = Math.max(1, ...steps.map((step) => step.value));

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.key} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">{step.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCompactNumber(step.value)}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{step.rateFromStart !== null ? `${step.rateFromStart.toFixed(1)}% from views` : "entry step"}</p>
              <p>{step.rateFromPrevious !== null ? `${step.rateFromPrevious.toFixed(1)}% from previous` : "no previous step"}</p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400"
              style={{ width: `${(step.value / max) * 100}%` }}
            />
          </div>
          {index < steps.length - 1 ? <div className="mt-4 h-5 w-px bg-slate-200" /> : null}
        </div>
      ))}
    </div>
  );
}

function SmallList({
  items,
  fallback,
}: {
  items: AnalyticsCount[];
  fallback: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{fallback}</p>;
  }

  return (
    <ul className="space-y-3 text-sm">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-4">
          <span className="truncate text-slate-700">{item.key}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function RecentEventsTable({ events }: { events: AnalyticsRecentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No recent events yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 pr-4 font-medium">Event</th>
            <th className="pb-3 pr-4 font-medium">When</th>
            <th className="pb-3 pr-4 font-medium">Lang</th>
            <th className="pb-3 pr-4 font-medium">Source</th>
            <th className="pb-3 pr-4 font-medium">Latency</th>
            <th className="pb-3 pr-4 font-medium">Messages</th>
            <th className="pb-3 pr-0 font-medium">Host</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-slate-100 align-top last:border-0">
              <td className="py-3 pr-4">
                <div className="font-medium text-slate-900">{formatEventName(event.eventName)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {event.errorType || event.pagePath || event.linkUrl || "system event"}
                </div>
              </td>
              <td className="py-3 pr-4 text-slate-600">
                <div>{formatRelativeTime(event.createdAt)}</div>
                <div className="mt-1 text-xs text-slate-400">{formatTimestamp(event.createdAt)}</div>
              </td>
              <td className="py-3 pr-4 text-slate-600">{event.language || "-"}</td>
              <td className="py-3 pr-4 text-slate-600">{event.source || "-"}</td>
              <td className="py-3 pr-4 text-slate-600">{event.responseTimeMs ? `${event.responseTimeMs} ms` : "-"}</td>
              <td className="py-3 pr-4 text-slate-600">{event.messageCount ?? "-"}</td>
              <td className="py-3 pr-0 text-slate-600">{shortenHostname(event.hostname)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessGate({ days }: { days: number }) {
  return (
    <main
      className="min-h-screen px-6 py-12 text-slate-900"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(21,93,252,0.12), transparent 30%), radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Ask Alisher</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Unlock analytics</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This dashboard is protected. Paste the access key from <code>ANALYTICS_DASHBOARD_KEY</code> to open the
            live reporting view.
          </p>
        </div>

        <form className="space-y-4" method="get">
          <input type="hidden" name="days" value={days} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Access key</span>
            <input
              name="key"
              type="password"
              autoComplete="off"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Open dashboard
          </button>
        </form>
      </div>
    </main>
  );
}

export default async function AnalyticsAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const providedKey = getSingleValue(params.key);
  const expectedKey = process.env.ANALYTICS_DASHBOARD_KEY || "";
  const requestedDays = Number(getSingleValue(params.days) || "7");
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.round(requestedDays), 1), 30) : 7;

  if (!expectedKey) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Analytics dashboard is not configured</h1>
          <p className="mt-3 text-sm text-slate-600">
            Set <code>ANALYTICS_DASHBOARD_KEY</code> in the environment and reload this page.
          </p>
        </div>
      </main>
    );
  }

  if (providedKey !== expectedKey) {
    return <AccessGate days={days} />;
  }

  const rows = await fetchAnalyticsRows(days);
  const summary = buildAnalyticsSummary(rows, days);
  const latestEvent = summary.recentEvents[0]?.createdAt ?? null;

  return (
    <main
      className="min-h-screen px-5 py-6 text-slate-900 sm:px-6 lg:px-8"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(21,93,252,0.12), transparent 24%), radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-200">Ask Alisher</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Analytics dashboard</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Built around the same dashboard patterns you see in product analytics tools: headline KPIs, trend
                lines, a conversion funnel, distribution splits, and a live recent-activity feed.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Window</p>
                  <p className="mt-2 text-2xl font-semibold">{summary.days} day{summary.days === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Last event</p>
                  <p className="mt-2 text-2xl font-semibold">{latestEvent ? formatRelativeTime(latestEvent) : "n/a"}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tracked sessions</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(summary.uniqueSessions)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Time range</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, 7, 14, 30].map((option) => {
                    const isActive = option === days;
                    return (
                      <a
                        key={option}
                        href={buildDaysHref(providedKey, option)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActive ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/15"
                        }`}
                      >
                        {option}d
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white px-5 py-4 text-slate-950">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Health snapshot</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold">{formatPercent(summary.firstResponseRate)}</p>
                    <p className="mt-1 text-sm text-slate-500">first-response conversion</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">{formatMillis(summary.averageResponseTimeMs)}</p>
                    <p className="mt-1 text-sm text-slate-500">average latency</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Events" value={formatCompactNumber(summary.totalEvents)} detail="all first-party events collected" tone="blue" />
          <KpiCard label="Prompt submits" value={formatCompactNumber(summary.promptSubmits)} detail="user attempts to talk to Alisher" tone="teal" />
          <KpiCard label="First responses" value={formatCompactNumber(summary.firstResponses)} detail="successful first streamed answers" tone="amber" />
          <KpiCard label="Response errors" value={formatCompactNumber(summary.responseErrors)} detail="server or client-side response failures" tone="rose" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <SectionShell
            title="Activity trend"
            subtitle="Views, prompt starts, successful first responses, and errors across the selected window."
            accent={<p className="text-sm text-slate-500">{summary.totalEvents} total events</p>}
          >
            <TrendChart points={summary.dailyTrend} />
          </SectionShell>

          <SectionShell
            title="Conversion funnel"
            subtitle="The core product flow from landing to first successful answer."
            accent={<p className="text-sm text-slate-500">{formatPercent(summary.firstResponseRate)} response rate</p>}
          >
            <FunnelChart steps={summary.funnel} />
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <SectionShell title="Top event mix" subtitle="Which product interactions dominate the current dataset.">
            <HorizontalBars items={summary.topEvents} />
          </SectionShell>

          <SectionShell title="Language split" subtitle="Event volume by interface language.">
            <DonutChart items={summary.languages} emptyLabel="No language data yet." />
          </SectionShell>

          <SectionShell title="Prompt sources" subtitle="How users are starting chats.">
            <DonutChart items={summary.promptSources} emptyLabel="No prompt-submit data yet." />
          </SectionShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionShell
            title="Response time by day"
            subtitle="Average first-token latency from the tracked response-time events."
            accent={<p className="text-sm text-slate-500">{formatMillis(summary.averageResponseTimeMs)} average</p>}
          >
            <ResponseTimeBars points={summary.dailyTrend} />
          </SectionShell>

          <div className="grid gap-6">
            <SectionShell title="Hostnames" subtitle="Traffic split across production and permalink hosts.">
              <SmallList items={summary.hostnames.map((item) => ({ ...item, key: shortenHostname(item.key) }))} fallback="No hostname data yet." />
            </SectionShell>

            <SectionShell title="Error types" subtitle="Breakdown of reported response failures.">
              <SmallList items={summary.errorTypes} fallback="No errors recorded in this window." />
            </SectionShell>
          </div>
        </section>

        <SectionShell
          title="Recent activity"
          subtitle="Latest raw events flowing into Supabase. This is the quickest way to confirm the dashboard is live."
          accent={latestEvent ? <p className="text-sm text-slate-500">Updated {formatRelativeTime(latestEvent)}</p> : null}
        >
          <RecentEventsTable events={summary.recentEvents} />
        </SectionShell>
      </div>
    </main>
  );
}
