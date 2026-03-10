# Ask Alisher Roadmap

## Current priority

1. Expand long-form voice coverage
2. Improve retrieval weighting
3. Add regression evaluation prompts
4. Harden public traffic protections

## In progress

### 1. Expand long-form voice coverage

- Switch transcript downloads to a manifest-driven workflow
- Keep a curated list of public talks and interviews in `scripts/alisher-video-manifest.json`
- Support incremental YouTube-only ingestion so new transcripts do not require a full corpus rebuild

### 2. Improve retrieval weighting

- Prefer Telegram for recent and date-scoped questions
- Prefer long-form sources for `why`, `how`, `mindset`, and `principles` questions
- Prefer bio/profile sources for `who are you` and role/background questions
- Boost first-person chunks and demote generic profile material when it is not relevant
- Infer topic tags and use them during reranking
- Surface supporting source snippets and topic labels in the UI

### 3. Evaluation set

- Starter regression suite added in `evals/alisher-core.json`
- CLI runner added in `scripts/run-evals.ts`
- Current checks cover biography, recency, entrepreneurship, chess, reading, regions, and refusal quality

## Next

### 4. Expand eval coverage

- Grow the eval set from the starter pack to 30-50 prompts
- Track answer quality, source quality, recency handling, and refusal quality
- Add expected source-type coverage and language-specific checks

### 5. Risk management

- Replace in-memory rate limiting with a durable external limiter
- Add Turnstile or equivalent bot friction
- Return graceful overload responses instead of hanging requests
