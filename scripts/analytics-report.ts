import { buildAnalyticsSummary, fetchAnalyticsRows } from "../src/lib/analytics-report";
import { loadLocalEnv, parseCliArgs } from "./lib/ingestion-utils";

loadLocalEnv();

function formatTop(items: { key: string; value: number }[], limit = 5): string {
  if (items.length === 0) return "none";
  return items.slice(0, limit).map(({ key, value }) => `${key}: ${value}`).join(" | ");
}

async function main() {
  const args = parseCliArgs();
  const days = Number(args.days || 7);

  if (!Number.isFinite(days) || days <= 0) {
    console.error("Invalid --days value");
    process.exit(1);
  }

  const rows = await fetchAnalyticsRows(days);
  const summary = buildAnalyticsSummary(rows, days);

  console.log(`Ask Alisher analytics summary — last ${days} day(s)\n`);
  console.log(`Events: ${summary.totalEvents}`);
  console.log(`Unique sessions: ${summary.uniqueSessions}`);
  console.log(`Prompt submits: ${summary.promptSubmits}`);
  console.log(`First responses: ${summary.firstResponses}`);
  console.log(`Response errors: ${summary.responseErrors}`);
  console.log(`First-response rate: ${summary.firstResponseRate !== null ? `${summary.firstResponseRate.toFixed(1)}%` : "n/a"}`);
  console.log(`Error rate: ${summary.errorRate !== null ? `${summary.errorRate.toFixed(1)}%` : "n/a"}`);
  console.log(
    `Average response time: ${summary.averageResponseTimeMs !== null ? `${summary.averageResponseTimeMs} ms` : "n/a"}`
  );
  console.log(`Top events: ${formatTop(summary.topEvents, 8)}`);
  console.log(`Languages: ${formatTop(summary.languages, 5)}`);
  console.log(`Hostnames: ${formatTop(summary.hostnames, 5)}`);
  console.log(`Prompt sources: ${formatTop(summary.promptSources, 5)}`);
  console.log(`Error types: ${formatTop(summary.errorTypes, 5)}`);
  console.log(`Views by day: ${formatTop(summary.dailyViews, days)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
