/**
 * Backfill topic and first-person metadata for existing documents.
 *
 * Usage:
 *   source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/backfill-topic-metadata.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  detectFirstPersonVoice,
  inferTopics,
  isLowSignalChunk,
  loadLocalEnv,
  parseCliArgs,
  sleep,
} from "./lib/ingestion-utils";
import { KNOWLEDGE_BASE_TABLE } from "../src/lib/knowledge-base";

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DEFAULT_BATCH_SIZE = 150;

type DocumentRow = {
  id: number;
  content: string;
  source_type: string;
  metadata: Record<string, unknown> | null;
};

function metadataNeedsUpdate(
  row: DocumentRow,
  nextTopics: string[],
  nextFirstPerson: boolean,
  nextLowSignal: boolean
): boolean {
  const currentTopics = Array.isArray(row.metadata?.topics)
    ? row.metadata?.topics.filter((item): item is string => typeof item === "string")
    : [];
  const currentFirstPerson = row.metadata?.is_first_person;
  const currentLowSignal = row.metadata?.is_low_signal;

  if (currentTopics.length !== nextTopics.length) return true;
  if (currentTopics.some((topic, index) => topic !== nextTopics[index])) return true;
  if (typeof currentFirstPerson !== "boolean") return true;
  if (typeof currentLowSignal !== "boolean") return true;
  if (currentLowSignal !== nextLowSignal) return true;

  return currentFirstPerson !== nextFirstPerson;
}

async function main() {
  const args = parseCliArgs();
  const batchSize = Number(args["batch-size"] || DEFAULT_BATCH_SIZE);

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    console.error("Invalid --batch-size value");
    process.exit(1);
  }

  let cursor = 0;
  let scanned = 0;
  let updated = 0;

  while (true) {
    const { data, error } = await supabase
      .from(KNOWLEDGE_BASE_TABLE)
      .select("id, content, source_type, metadata")
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(batchSize);

    if (error) {
      console.error("Failed to fetch documents:", error.message);
      process.exit(1);
    }

    const rows = (data as DocumentRow[] | null) ?? [];
    if (rows.length === 0) break;

    let batchUpdates = 0;

    for (const row of rows) {
      const nextTopics = inferTopics(row.content);
      const nextFirstPerson = detectFirstPersonVoice(row.content);
      const nextLowSignal = isLowSignalChunk(row.content, row.source_type);

      if (!metadataNeedsUpdate(row, nextTopics, nextFirstPerson, nextLowSignal)) {
        continue;
      }

      const { error: updateError } = await supabase
        .from(KNOWLEDGE_BASE_TABLE)
        .update({
          metadata: {
            ...(row.metadata || {}),
            topics: nextTopics,
            is_first_person: nextFirstPerson,
            is_low_signal: nextLowSignal,
          },
        })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update document ${row.id}: ${updateError.message}`);
        continue;
      }

      updated += 1;
      batchUpdates += 1;
    }

    scanned += rows.length;
    cursor = rows[rows.length - 1].id;
    console.log(`Scanned ${scanned} rows, updated ${updated} rows (batch updates: ${batchUpdates}).`);
    await sleep(120);
  }

  console.log(`\nTopic metadata backfill complete. Updated ${updated} rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
