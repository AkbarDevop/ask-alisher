import * as fs from "fs";
import * as path from "path";
import { loadLocalEnv, parseCliArgs } from "./lib/ingestion-utils";

loadLocalEnv();

type EvalSpec = {
  id: string;
  question: string;
  language?: "en" | "uz";
  min_sources?: number;
  max_sources?: number;
  required_topics_any?: string[];
  required_source_types_any?: string[];
  required_source_families_any?: string[];
  must_include_any?: string[];
  must_not_include_any?: string[];
  refusal_expected?: boolean;
  refusal_disallow_sources?: boolean;
  require_snippets?: boolean;
  require_stale_context?: boolean;
  require_limited_confidence?: boolean;
};

type EvalSource = {
  sourceId: string;
  sourceType?: string;
  title?: string;
  snippet?: string;
  topics?: string[];
};

type EvalSourceContext = {
  latestPublishedAt?: string;
  stale?: boolean;
  limitedConfidence?: boolean;
  sourceFamilies?: string[];
  hasMixedSources?: boolean;
};

type EvalResult = {
  spec: EvalSpec;
  answer: string;
  sources: EvalSource[];
  sourceContext: EvalSourceContext | null;
  failures: string[];
};

const UZBEK_RESPONSE_PREFIX = "[Respond in Uzbek / O'zbek tilida javob bering]\n";
const REFUSAL_PATTERNS = [
  /i haven't spoken publicly about/u,
  /i have not spoken publicly about/u,
  /that(?:'s| is) not something i've shared publicly(?: yet)?/u,
  /i do not have any information on that/u,
  /i don't have any information on that/u,
  /i haven't shared(?: my| any)? .*publicly/u,
  /bu haqda ochiq gapirmaganman/u,
  /bu mavzu bo'yicha ochiq fikr bildirganim yo'q/u,
  /buni omma bilan ulashmaganman/u,
  /bu haqda menda ma'lumot yo'q/u,
];

function readEvalFile(filePath: string): EvalSpec[] {
  const resolved = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(resolved, "utf-8");
  return JSON.parse(raw) as EvalSpec[];
}

async function streamChat(baseUrl: string, spec: EvalSpec): Promise<{ answer: string; sources: EvalSource[]; sourceContext: EvalSourceContext | null }> {
  const payload = {
    messages: [
      {
        role: "user",
        content:
          spec.language === "uz"
            ? `${UZBEK_RESPONSE_PREFIX}${spec.question}`
            : spec.question,
      },
    ],
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const sources: EvalSource[] = [];
  let sourceContext: EvalSourceContext | null = null;
  const textParts = new Map<string, string>();
  const seenSources = new Set<string>();
  let buffer = "";

  const processEvent = (line: string) => {
    if (!line || line === "[DONE]") return;

    const event = JSON.parse(line) as
      | {
          type: "source-url";
          sourceId: string;
          sourceType?: string;
          title?: string;
          snippet?: string;
          topics?: string[];
        }
      | {
          type: "source-context";
          latestPublishedAt?: string;
          stale?: boolean;
          limitedConfidence?: boolean;
          sourceFamilies?: string[];
          hasMixedSources?: boolean;
        }
      | { type: "text-start"; id: string }
      | { type: "text-delta"; id: string; delta: string }
      | { type: string };

    switch (event.type) {
      case "source-context":
        sourceContext = {
          latestPublishedAt: event.latestPublishedAt,
          stale: event.stale,
          limitedConfidence: event.limitedConfidence,
          sourceFamilies: event.sourceFamilies,
          hasMixedSources: event.hasMixedSources,
        };
        return;
      case "source-url":
        if (seenSources.has(event.sourceId)) return;
        seenSources.add(event.sourceId);
        sources.push({
          sourceId: event.sourceId,
          sourceType: event.sourceType,
          title: event.title,
          snippet: event.snippet,
          topics: event.topics,
        });
        return;
      case "text-start":
        if (!textParts.has(event.id)) {
          textParts.set(event.id, "");
        }
        return;
      case "text-delta":
        textParts.set(event.id, `${textParts.get(event.id) || ""}${event.delta}`);
        return;
      default:
        return;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk
        .split(/\r?\n/u)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      for (const line of lines) {
        processEvent(line);
      }
    }
  }

  const trailing = decoder.decode();
  if (trailing) {
    buffer += trailing;
  }

  if (buffer.trim()) {
    const lines = buffer
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    for (const line of lines) {
      processEvent(line);
    }
  }

  return {
    answer: [...textParts.values()].join("").trim(),
    sources,
    sourceContext,
  };
}

function evaluateResult(
  spec: EvalSpec,
  answer: string,
  sources: EvalSource[],
  sourceContext: EvalSourceContext | null
): string[] {
  const failures: string[] = [];
  const normalizedAnswer = answer.toLowerCase();

  if (!answer) {
    failures.push("empty answer");
  }

  if (typeof spec.min_sources === "number" && sources.length < spec.min_sources) {
    failures.push(`expected at least ${spec.min_sources} sources, got ${sources.length}`);
  }

  if (typeof spec.max_sources === "number" && sources.length > spec.max_sources) {
    failures.push(`expected at most ${spec.max_sources} sources, got ${sources.length}`);
  }

  if (spec.require_snippets && sources.length > 0 && !sources.some((source) => source.snippet?.trim())) {
    failures.push("expected at least one source snippet");
  }

  if (
    spec.required_topics_any?.length &&
    !sources.some((source) =>
      (source.topics || []).some((topic) => spec.required_topics_any?.includes(topic))
    )
  ) {
    failures.push(`expected source topics to include one of: ${spec.required_topics_any.join(", ")}`);
  }

  if (
    spec.required_source_types_any?.length &&
    !sources.some((source) => spec.required_source_types_any?.includes(source.sourceType || ""))
  ) {
    failures.push(
      `expected source types to include one of: ${spec.required_source_types_any.join(", ")}`
    );
  }

  if (
    spec.required_source_families_any?.length &&
    !spec.required_source_families_any.some((family) => sourceContext?.sourceFamilies?.includes(family))
  ) {
    failures.push(
      `expected source families to include one of: ${spec.required_source_families_any.join(", ")}`
    );
  }

  if (
    spec.must_include_any?.length &&
    !spec.must_include_any.some((needle) => normalizedAnswer.includes(needle.toLowerCase()))
  ) {
    failures.push(`answer did not include any expected terms: ${spec.must_include_any.join(", ")}`);
  }

  if (
    spec.must_not_include_any?.length &&
    spec.must_not_include_any.some((needle) => normalizedAnswer.includes(needle.toLowerCase()))
  ) {
    failures.push(`answer included blocked terms: ${spec.must_not_include_any.join(", ")}`);
  }

  if (spec.refusal_expected) {
    const refused = REFUSAL_PATTERNS.some((pattern) => pattern.test(normalizedAnswer));
    if (!refused) {
      failures.push("expected a public-information refusal");
    }
  }

  if (spec.refusal_disallow_sources && sources.length > 0) {
    failures.push(`expected no sources on refusal, got ${sources.length}`);
  }

  if (spec.require_stale_context && !sourceContext?.stale) {
    failures.push("expected stale source-context metadata");
  }

  if (spec.require_limited_confidence && !sourceContext?.limitedConfidence) {
    failures.push("expected limited-confidence source-context metadata");
  }

  return failures;
}

async function main() {
  const args = parseCliArgs();
  const evalFile = typeof args.file === "string" ? args.file : "evals/alisher-core.json";
  const baseUrl =
    (typeof args["base-url"] === "string" && args["base-url"]) ||
    process.env.EVAL_BASE_URL ||
    "http://localhost:3000";
  const specs = readEvalFile(evalFile);
  const results: EvalResult[] = [];

  console.log(`Running ${specs.length} evals against ${baseUrl}\n`);

  for (const spec of specs) {
    const { answer, sources, sourceContext } = await streamChat(baseUrl, spec);
    const failures = evaluateResult(spec, answer, sources, sourceContext);
    results.push({ spec, answer, sources, sourceContext, failures });

    const status = failures.length === 0 ? "PASS" : "FAIL";
    console.log(`${status} ${spec.id}`);
    if (failures.length > 0) {
      console.log(`  ${failures.join(" | ")}`);
    }
  }

  const passed = results.filter((result) => result.failures.length === 0).length;
  const failed = results.length - passed;

  console.log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
