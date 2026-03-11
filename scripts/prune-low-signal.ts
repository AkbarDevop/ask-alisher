import { createClient } from "@supabase/supabase-js";
import { KNOWLEDGE_BASE_TABLE } from "../src/lib/knowledge-base";
import { loadLocalEnv, parseCliArgs, sleep } from "./lib/ingestion-utils";

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DEFAULT_BATCH_SIZE = 200;

type LowSignalRow = {
  id: number;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
};

async function main() {
  const args = parseCliArgs();
  const dryRun = args["dry-run"] === true;
  const batchSize = Number(args["batch-size"] || DEFAULT_BATCH_SIZE);

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    console.error("Invalid --batch-size value");
    process.exit(1);
  }

  let cursor = 0;
  let totalMatched = 0;
  let totalDeleted = 0;

  while (true) {
    const { data, error } = await supabase
      .from(KNOWLEDGE_BASE_TABLE)
      .select("id, source_url, metadata")
      .eq("source_type", "telegram_post")
      .contains("metadata", { is_low_signal: true })
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(batchSize);

    if (error) {
      console.error("Failed to fetch low-signal rows:", error.message);
      process.exit(1);
    }

    const rows = (data as LowSignalRow[] | null) ?? [];
    if (rows.length === 0) {
      break;
    }

    totalMatched += rows.length;
    cursor = rows[rows.length - 1].id;

    if (dryRun) {
      console.log(`Would delete ${rows.length} low-signal row(s) up to id ${cursor}.`);
      continue;
    }

    const ids = rows.map((row) => row.id);
    const { error: deleteError } = await supabase
      .from(KNOWLEDGE_BASE_TABLE)
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error(`Failed to delete rows ending at id ${cursor}: ${deleteError.message}`);
      process.exit(1);
    }

    totalDeleted += ids.length;
    console.log(`Deleted ${ids.length} low-signal row(s) up to id ${cursor}.`);
    await sleep(120);
  }

  if (dryRun) {
    console.log(`\nDry run complete. Matched ${totalMatched} row(s).`);
    return;
  }

  console.log(`\nPrune complete. Deleted ${totalDeleted} low-signal row(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
