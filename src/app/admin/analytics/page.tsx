import type { Metadata } from "next";
import { buildAnalyticsSummary, fetchAnalyticsRows } from "@/lib/analytics-report";

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
  return value === null ? "n/a" : `${value} ms`;
}

function renderCountList(items: { key: string; value: number }[]) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No data yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-4">
          <span className="truncate">{item.key}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-900">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

function buildDaysHref(key: string, days: number): string {
  return `/admin/analytics?key=${encodeURIComponent(key)}&days=${days}`;
}

export default async function AnalyticsAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const providedKey = getSingleValue(params.key);
  const expectedKey = process.env.ANALYTICS_DASHBOARD_KEY || "";
  const requestedDays = Number(getSingleValue(params.days) || "7");
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.round(requestedDays), 1), 30) : 7;

  if (!expectedKey) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12 text-gray-900">
        <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Analytics dashboard is not configured</h1>
          <p className="mt-3 text-sm text-gray-600">
            Set <code>ANALYTICS_DASHBOARD_KEY</code> in the environment and reload this page.
          </p>
        </div>
      </main>
    );
  }

  if (providedKey !== expectedKey) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12 text-gray-900">
        <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Ask Alisher</p>
            <h1 className="mt-2 text-2xl font-semibold">Unlock analytics</h1>
            <p className="mt-3 text-sm text-gray-600">
              This dashboard is protected. Paste the access key you set in Netlify as
              {" "}
              <code>ANALYTICS_DASHBOARD_KEY</code>.
            </p>
          </div>

          <form className="space-y-4" method="get">
            <input
              type="hidden"
              name="days"
              value={days}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Access key</span>
              <input
                name="key"
                type="password"
                autoComplete="off"
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Open dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  const rows = await fetchAnalyticsRows(days);
  const summary = buildAnalyticsSummary(rows, days);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-gray-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Ask Alisher</p>
              <h1 className="mt-2 text-3xl font-semibold">Analytics dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm text-gray-600">
                First-party event telemetry from Supabase. This view tracks prompt volume, response quality, and
                traffic shape without touching Google Analytics.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[1, 7, 14, 30].map((option) => {
                const isActive = option === days;
                return (
                  <a
                    key={option}
                    href={buildDaysHref(providedKey, option)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option}d
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Events", value: String(summary.totalEvents) },
            { label: "Unique sessions", value: String(summary.uniqueSessions) },
            { label: "Prompt submits", value: String(summary.promptSubmits) },
            { label: "First responses", value: String(summary.firstResponses) },
            { label: "Response errors", value: String(summary.responseErrors) },
            { label: "First-response rate", value: formatPercent(summary.firstResponseRate) },
            { label: "Error rate", value: formatPercent(summary.errorRate) },
            { label: "Avg response time", value: formatMillis(summary.averageResponseTimeMs) },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Top events</h2>
            <div className="mt-4">{renderCountList(summary.topEvents)}</div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Views by day</h2>
            <div className="mt-4">{renderCountList(summary.dailyViews)}</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Languages</h2>
            <div className="mt-4">{renderCountList(summary.languages)}</div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Hostnames</h2>
            <div className="mt-4">{renderCountList(summary.hostnames)}</div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Prompt sources</h2>
            <div className="mt-4">{renderCountList(summary.promptSources)}</div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Error types</h2>
            <div className="mt-4">{renderCountList(summary.errorTypes)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
