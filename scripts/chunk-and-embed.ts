/**
 * Data ingestion script: reads text files from data/ directory,
 * chunks them, and inserts into Supabase.
 *
 * Usage:
 *   npx tsx scripts/chunk-and-embed.ts
 *
 * Place your source text files in a data/ directory at the project root.
 * Each file should be named like: interview_the-tech.txt, article_tribune.txt, etc.
 * The part before the underscore becomes the source_type.
 *
 * Embedding generation uses Gemini text-embedding-004 (free, 768D).
 * Requires GOOGLE_GENERATIVE_AI_API_KEY in environment.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import {
  collectFilesRecursive,
  detectLanguageHeuristic,
  detectFirstPersonVoice,
  inferTopics,
  isLowSignalChunk,
  parseStructuredDocument,
  chunkText,
  loadLocalEnv,
  parseCliArgs,
  sleep,
} from "./lib/ingestion-utils";
import { getGeminiEmbeddings } from "./lib/gemini-embeddings";
import { KNOWLEDGE_BASE_TABLE } from "../src/lib/knowledge-base";

const DATA_DIR = path.join(process.cwd(), "data");
const BATCH_SIZE = 20;
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 1200;

loadLocalEnv();

// --- Supabase client (service role for inserts) ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  console.error("Make sure .env.local is loaded. Run with:");
  console.error(
    '  source <(grep -v "^#" .env.local | grep "=" | sed \'s/^/export /\') && npx tsx scripts/chunk-and-embed.ts'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Gemini embeddings (free, 768D) ---
let embedBatch: ((texts: string[]) => Promise<number[][]>) | null = null;

async function initEmbeddings() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    embedBatch = async (texts: string[]) =>
      getGeminiEmbeddings(texts, {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
        title: "Alisher Sadullaev knowledge base",
      });
    console.log("Embeddings: ENABLED (Gemini gemini-embedding-001, 768D)\n");
  } else {
    console.log(
      "Embeddings: DISABLED (no GOOGLE_GENERATIVE_AI_API_KEY)\n"
    );
  }
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;

      const delayMs = RETRY_BASE_DELAY_MS * attempt;
      console.warn(`${label} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

// --- Source type from filename ---
function parseFilename(filename: string): {
  sourceType: string;
  sourceUrl: string | null;
  language: string;
} {
  const normalized = filename.replace(/\\/g, "/");

  if (normalized.startsWith("youtube/")) {
    return { sourceType: "youtube", sourceUrl: null, language: "uz" };
  }

  if (normalized.startsWith("telegram_posts/")) {
    return { sourceType: "telegram_post", sourceUrl: null, language: "uz" };
  }

  const name = path.basename(filename, path.extname(filename));
  const parts = name.split("_");
  const sourceType = parts[0] || "article";
  const language = parts.includes("uz") ? "uz" : "en";

  return { sourceType, sourceUrl: null, language };
}

function extractUrl(content: string): string | null {
  const match = content.match(/URL:\s*(https?:\/\/\S+)/);
  return match ? match[1] : null;
}

function detectLanguage(content: string): string | null {
  const match = content.match(/Language:\s*(\S+)/);
  if (match) {
    const lang = match[1].toLowerCase();
    if (lang.includes("russian") || lang === "ru") return "ru";
    if (lang.includes("english") || lang === "en") return "en";
  }
  return null;
}

function parseMetadataList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getSourceDomain(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function inferSourceAuthority(
  sourceType: string,
  sourceDomain: string | null,
  structuredMetadata: Record<string, string>
): string {
  const explicit = structuredMetadata.SourceAuthority || structuredMetadata.source_authority;
  if (explicit) return explicit.toLowerCase();

  if (sourceDomain === "gov.uz") return "official";
  if (sourceDomain === "t.me") return "social";
  if (sourceDomain?.includes("youtube")) return "platform";
  if (sourceDomain?.includes("linkedin")) return "professional_network";
  if (["bio", "presentation"].includes(sourceType)) return "reference";

  return "public_web";
}

function inferDomainTags(
  sourceType: string,
  sourceDomain: string | null,
  structuredMetadata: Record<string, string>,
  topics: string[]
): string[] {
  const explicit = [
    ...parseMetadataList(structuredMetadata.DomainTags),
    ...parseMetadataList(structuredMetadata.domain_tags),
  ];

  const tags = new Set<string>(explicit);
  const sourceAuthority = inferSourceAuthority(sourceType, sourceDomain, structuredMetadata);
  const organization = (structuredMetadata.Organization || "").toLowerCase();

  if (sourceAuthority === "official") {
    tags.add("official");
    tags.add("government");
  }
  if (organization.includes("youth affairs agency")) {
    tags.add("youth_affairs_agency");
  }
  if (sourceDomain === "t.me") {
    tags.add("telegram_channel");
  }
  if (sourceDomain?.includes("youtube")) {
    tags.add("video_platform");
  }

  if (topics.includes("regional_visits")) tags.add("regions");
  if (topics.includes("entrepreneurship")) tags.add("startup_support");
  if (topics.includes("international")) tags.add("international");
  if (topics.includes("women_empowerment")) tags.add("women_empowerment");
  if (topics.includes("chess")) tags.add("chess_development");
  if (topics.includes("policy") || topics.includes("education") || topics.includes("youth")) {
    tags.add("programs");
  }

  return [...tags];
}

function buildChunkContent(
  sourceType: string,
  chunk: string,
  structuredMetadata: Record<string, string>
): string {
  if (sourceType !== "telegram_post") {
    return chunk;
  }

  const lines = [
    "Telegram channel post",
    `Channel: ${structuredMetadata.Channel ?? "@alisher_sadullaev"}`,
    `Post ID: ${structuredMetadata["Post ID"] ?? ""}`,
    `Date: ${structuredMetadata.Date ?? ""}`,
    `URL: ${structuredMetadata.URL ?? ""}`,
    "",
    chunk,
  ];

  return lines.filter(Boolean).join("\n");
}

// --- Main ---
async function main() {
  const args = parseCliArgs();
  if (args.help === true || args.h === true) {
    console.log("Usage: npx tsx scripts/chunk-and-embed.ts");
    console.log(`Reads all .txt/.md files under data/, generates embeddings, and rebuilds ${KNOWLEDGE_BASE_TABLE}.`);
    console.log("Optional flags:");
    console.log("  --prefix=youtube/      Only process files under a path prefix relative to data/");
    console.log("  --skip-clear           Preserve the table and replace only matching source rows");
    return;
  }

  await initEmbeddings();

  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data/ directory at ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(
      "Place your source text files in data/ and run this script again."
    );
    return;
  }

  const prefixFilter =
    typeof args.prefix === "string" && args.prefix.trim().length > 0
      ? args.prefix.trim().replace(/\\/g, "/")
      : null;
  const shouldClearAll = args["skip-clear"] !== true && !prefixFilter;
  const allFiles = collectFilesRecursive(DATA_DIR);
  const files = prefixFilter
    ? allFiles.filter((filePath) =>
        path.relative(DATA_DIR, filePath).replace(/\\/g, "/").startsWith(prefixFilter)
      )
    : allFiles;

  if (files.length === 0) {
    console.log("No .txt or .md files found in data/ directory.");
    return;
  }

  console.log(`Found ${files.length} file(s) to process.\n`);

  if (shouldClearAll) {
    console.log(`Clearing existing rows from ${KNOWLEDGE_BASE_TABLE}...`);
    const { error: delError } = await supabase.from(KNOWLEDGE_BASE_TABLE).delete().gte("id", 0);
    if (delError) {
      console.error(`Warning: could not clear existing data: ${delError.message}`);
    } else {
      console.log(`Cleared existing rows from ${KNOWLEDGE_BASE_TABLE}.\n`);
    }
  } else {
    console.log(`Preserving ${KNOWLEDGE_BASE_TABLE}; matching source rows will be replaced incrementally.\n`);
  }

  let totalChunks = 0;
  let totalSkippedLowSignalChunks = 0;

  for (const filePath of files) {
    const file = path.relative(DATA_DIR, filePath);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const structured = parseStructuredDocument(rawContent);
    const parsed = parseFilename(file);
    const sourceType = parsed.sourceType;
    const content = structured.body || rawContent;
    const language =
      detectLanguage(rawContent) ||
      (sourceType === "telegram_post"
        ? detectLanguageHeuristic(content)
        : null) ||
      parsed.language;
    const sourceUrl = extractUrl(rawContent);
    const sourceDomain = getSourceDomain(sourceUrl);
    const sourceAuthority = inferSourceAuthority(sourceType, sourceDomain, structured.metadata);

    console.log(
      `Processing: ${file} (type: ${sourceType}, lang: ${language})`
    );

    if (!shouldClearAll) {
      let deleteQuery = supabase.from(KNOWLEDGE_BASE_TABLE).delete().eq("source_type", sourceType);
      if (sourceUrl) {
        deleteQuery = deleteQuery.eq("source_url", sourceUrl);
      } else {
        deleteQuery = deleteQuery.contains("metadata", { file });
      }

      const { error: replaceError } = await deleteQuery;
      if (replaceError) {
        console.error(`  Warning: could not replace existing rows for ${file}: ${replaceError.message}`);
      }
    }

    const chunks = chunkText(content);
    console.log(`  → ${chunks.length} chunks before low-signal filtering`);

    const preparedChunks = chunks
      .map((chunk, index) => {
        const chunkContent = buildChunkContent(sourceType, chunk, structured.metadata);
        const lowSignal = isLowSignalChunk(chunkContent, sourceType);

        return {
          chunkContent,
          chunkIndex: index,
          lowSignal,
        };
      })
      .filter((entry) => !entry.lowSignal);

    const skippedLowSignalChunks = chunks.length - preparedChunks.length;
    totalSkippedLowSignalChunks += skippedLowSignalChunks;

    if (skippedLowSignalChunks > 0) {
      console.log(`  → skipped ${skippedLowSignalChunks} low-signal chunk(s)`);
    }

    if (preparedChunks.length === 0) {
      console.log("  → no chunks left after filtering, skipping file");
      continue;
    }

    console.log(`  → ${preparedChunks.length} chunks will be inserted`);

    for (let i = 0; i < preparedChunks.length; i += BATCH_SIZE) {
      const batch = preparedChunks.slice(i, i + BATCH_SIZE);

      // Generate embeddings if available (gracefully skip on quota errors)
      let embeddings: number[][] | null = null;
      if (embedBatch) {
        try {
          embeddings = await withRetry("Embedding batch", () => embedBatch!(batch.map((entry) => entry.chunkContent)));
        } catch (error) {
          const message = String(error).toLowerCase();
          if (
            message.includes("quota") ||
            message.includes("rate") ||
            message.includes("429")
          ) {
            console.log("  Embedding quota exceeded — inserting without embeddings");
            embedBatch = null; // Disable for remaining batches
          } else {
            throw error;
          }
        }
      }

      const rows = batch.map((chunk, j) => {
        const topics = inferTopics(chunk.chunkContent);
        const publishedAt =
          structured.metadata.published_at ||
          structured.metadata.Date ||
          structured.metadata.date ||
          null;

        return {
          content: chunk.chunkContent,
          embedding: embeddings ? JSON.stringify(embeddings[j]) : null,
          source_type: sourceType,
          source_url: sourceUrl,
          language,
          metadata: {
            file,
            chunk_index: chunk.chunkIndex,
            topics,
            domain_tags: inferDomainTags(sourceType, sourceDomain, structured.metadata, topics),
            is_first_person: detectFirstPersonVoice(chunk.chunkContent),
            is_low_signal: false,
            source_domain: sourceDomain,
            source_authority: sourceAuthority,
            published_at: publishedAt,
            is_official:
              sourceAuthority === "official" ||
              structured.metadata.is_official === "true" ||
              structured.metadata.IsOfficial === "true",
            ...structured.metadata,
          },
        };
      });

      await withRetry("Insert batch", async () => {
        const { error } = await supabase.from(KNOWLEDGE_BASE_TABLE).insert(rows);
        if (error) {
          throw new Error(error.message);
        }
      });

      console.log(
        `  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(preparedChunks.length / BATCH_SIZE)}`
      );

      await sleep(150);
    }

    totalChunks += preparedChunks.length;
  }

  console.log(`\nDone! Inserted ${totalChunks} total chunks.`);
  console.log(`Skipped ${totalSkippedLowSignalChunks} low-signal chunk(s).`);
}

main().catch(console.error);
