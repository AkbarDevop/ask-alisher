# Ask Alisher Roadmap

## Current priority

1. Expand long-form voice coverage
2. Improve retrieval weighting
3. Add regression evaluation prompts
4. Harden public traffic protections
5. Add first-party analytics reporting

## In progress

### 1. Expand long-form voice coverage

- Switch transcript downloads to a manifest-driven workflow
- Keep a curated list of public talks and interviews in `scripts/alisher-video-manifest.json`
- Support incremental YouTube-only ingestion so new transcripts do not require a full corpus rebuild
- Added larger Kunuz and Alter Ego interviews to deepen the non-Telegram corpus

### 2. Improve retrieval weighting

- Prefer Telegram for recent and date-scoped questions
- Prefer long-form sources for `why`, `how`, `mindset`, and `principles` questions
- Prefer bio/profile sources for `who are you` and role/background questions
- Boost first-person chunks and demote generic profile material when it is not relevant
- Infer topic tags and use them during reranking
- Surface supporting source snippets and topic labels in the UI
- Skip low-signal Telegram export artifacts during ingestion and prune existing leftovers from Supabase

### 3. Evaluation set

- Starter regression suite added in `evals/alisher-core.json`
- CLI runner added in `scripts/run-evals.ts`
- Current checks cover biography, recency, entrepreneurship, chess, reading, regions, and refusal quality

### 4. Traffic and analytics

- Durable rate limiting added through the `consume_ask_alisher_rate_limit()` Supabase RPC
- First-party analytics ingestion added via `/api/analytics/collect`
- Local reporting script added in `scripts/analytics-report.ts`
- Protected `/admin/analytics` dashboard added for quick browser-side reporting
- Dashboard now includes trend charts, funnel view, split charts, a traffic health strip, CSV export, top prompts, and a recent event stream

## Next

### 5. Expand eval coverage

- Grow the eval set from the starter pack to 30-50 prompts
- Track answer quality, source quality, recency handling, and refusal quality
- Add expected source-type coverage and language-specific checks

### 6. Risk management

- Add Turnstile or equivalent bot friction
- Return graceful overload responses instead of hanging requests
- Decide whether the analytics dashboard needs stronger auth than an environment-backed access key
