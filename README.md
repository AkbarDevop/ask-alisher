<div align="center">

<img src="public/alisher.jpg" width="120" height="120" style="border-radius: 50%;" alt="Alisher Sadullaev" />

# Ask Alisher

**Chat with an AI clone of Alisher Sadullaev** — grounded in his public Telegram posts, interviews, talks, official pages, and other public-source material.

</div>

---

## What is this?

`ask-alisher` is a retrieval-augmented chat app built from the same architecture as `ask-akmal`, but adapted for Alisher Sadullaev.

The bot is designed to answer questions in Alisher's public voice using only retrieved context from:

- the public `@alisher_sadullaev` Telegram archive
- public YouTube interviews and talks
- official public-source briefs from `gov.uz` and other government / agency pages
- short public bio/profile material

It is best suited for questions about youth development, education, entrepreneurship, volunteering, regional initiatives, reading culture, and chess.

## How it works

```text
User question -> Gemini embedding -> pgvector similarity search -> date-aware + source-aware retrieval -> Gemini 2.5 Flash -> streamed response with source cards
```

1. Public-source documents are chunked and embedded into `documents_alisher` in Supabase with richer metadata like `source_domain`, `source_authority`, `domain_tags`, `published_at`, and `is_official`.
2. The API route retrieves semantically similar chunks, with extra Telegram handling for recent/date-specific prompts and extra boosting for official/public sources when the question is about programs, policy, regions, or institutional roles.
3. Gemini 2.5 Flash generates the answer using only retrieved context.
4. The client streams the answer and renders source cards with snippets, topic labels, and more human source titles separately.
5. Low-signal Telegram export artifacts are filtered out during ingestion so the app prefers substantive posts over pinned-photo or pinned-voice placeholders.
6. Durable rate limiting now runs through Supabase RPC instead of per-instance memory.

## Stack

- Next.js 16
- Vercel AI SDK v6
- Gemini 2.5 Flash
- Gemini `gemini-embedding-001` embeddings
- Supabase + pgvector
- Tailwind CSS v4
- TypeScript

## Setup

```bash
git clone <your-new-repo-url>
cd ask-alisher
npm install
```

Create `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_GTM_ID=GTM-N3M3DLLG
NEXT_PUBLIC_GA_MEASUREMENT_IDS=G-BWTQB4SFP4,G-2XNF6BSJG8
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
ANALYTICS_DASHBOARD_KEY=your_private_dashboard_key
SITE_URL=https://askalishersadullaev.netlify.app
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=your_telegram_webhook_secret
INTERNAL_API_SECRET=your_internal_api_secret
```

Important:

- This repo is already isolated to the `documents_alisher` table and `match_alisher_documents()` RPC.
- It can share the same Supabase project as `ask-akmal` without overwriting `documents`.
- `scripts/chunk-and-embed.ts` rebuilds only the `documents_alisher` corpus.
- `scripts/backfill-topic-metadata.ts` can enrich the existing corpus with `topics`, `is_first_person`, and `is_low_signal` metadata without rebuilding embeddings.
- The current corpus now includes Telegram, YouTube, bio material, and versioned official public-source briefs under `data/official/`.
- Official/public chunks now carry richer metadata like `source_domain`, `source_authority`, `domain_tags`, `published_at`, and `is_official` so retrieval can prefer them more intelligently.
- GTM is wired through `NEXT_PUBLIC_GTM_ID`, defaulting to `GTM-N3M3DLLG` for the Alisher site.
- GA4 is wired through `NEXT_PUBLIC_GA_MEASUREMENT_IDS`, defaulting to `G-BWTQB4SFP4,G-2XNF6BSJG8`.
- Soft abuse protection is wired for Cloudflare Turnstile. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to enable it on the web chat route.
- The app now writes a small first-party analytics stream into Supabase for local reporting scripts.
- The protected first-party analytics dashboard reads `ANALYTICS_DASHBOARD_KEY` from the server environment.
- The dashboard now includes sparkline KPI cards, anomaly flags, trend charts, conversion flow, prompt splits by language, a traffic health strip, top prompts, CSV export, citation-click analytics, a prompt explorer, a knowledge-base freshness panel, and a recent-events stream at `/admin/analytics`.
- Telegram bot webhook traffic is handled at `/api/telegram/webhook` and reuses the same Ask Alisher answer engine.
- `TELEGRAM_WEBHOOK_SECRET` protects the webhook endpoint, and `INTERNAL_API_SECRET` is used only for the internal bot-to-chat API call.

## Database

Push the included Supabase migrations:

```bash
npx supabase db push
```

## Collect data

Fetch the Telegram archive snapshot:

```bash
npm run sync:telegram
```

Fetch the full public Telegram history:

```bash
npm run sync:telegram:all
```

Download the curated public YouTube manifest:

```bash
python3 scripts/download-remaining-yt.py
```

The repo also includes curated official public-source briefs under `data/official/`. They are included automatically in the full rebuild command below.

Ingest only the updated YouTube transcripts without rebuilding the whole corpus:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts --prefix=youtube/ --skip-clear
```

Remove already-ingested low-signal Telegram rows from Supabase:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npm run prune:low-signal
```

Or rebuild everything under `data/`:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts
```

Backfill topic and first-person metadata onto the existing Supabase corpus:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/backfill-topic-metadata.ts
```

Run the starter regression eval set against a local or deployed app:

```bash
npm run evals:core -- --base-url=http://localhost:3000
```

Or against production:

```bash
EVAL_BASE_URL=https://askalishersadullaev.netlify.app npm run evals:core
```

Print a first-party analytics summary from Supabase:

```bash
npm run analytics:summary -- --days=7
```

Open the protected analytics dashboard:

```text
/admin/analytics?key=YOUR_ANALYTICS_DASHBOARD_KEY
```

Configure the Telegram bot webhook, descriptions, commands, menu button, and profile photo:

```bash
npm run telegram:setup
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Repo notes

- Telegram sync defaults are already pointed at `@alisher_sadullaev`.
- The UI, prompt pack, and metadata are adapted for Alisher Sadullaev.
- A small public bio seed file is included in `data/`.
- The YouTube downloader now reads from `scripts/alisher-video-manifest.json`.
- The YouTube manifest now includes extra long-form youth policy, girls' education, collaboration, and interview coverage.
- The repo now includes versioned official public-source briefs in `data/official/`, including Youth Affairs Agency and other `gov.uz` material.
- Retrieval now uses richer domain-aware metadata so official/public sources can outrank Telegram when the question is really about policy, programs, regional work, or institutional context.
- Source cards now show a supporting snippet plus inferred topic tags.
- Telegram ingestion now skips low-signal export artifacts, and `npm run prune:low-signal` removes any already stored leftovers.
- Durable rate limiting uses the `consume_ask_alisher_rate_limit()` Supabase RPC.
- First-party analytics events are stored in `ask_alisher_analytics_events` for local reporting.
- A protected `/admin/analytics` dashboard is available on top of the same first-party analytics table.
- Telegram bot conversation turns are also stored in `ask_alisher_analytics_events` so the bot can keep short per-chat context.
- The repo includes a starter regression suite in `evals/alisher-core.json`.
- The current roadmap is tracked in `docs/roadmap.md`.

## Project structure

```text
src/
  app/
  components/
  lib/
scripts/
  alisher-video-manifest.json
  analytics-report.ts
  backfill-topic-metadata.ts
  chunk-and-embed.ts
  fetch-telegram-channel.ts
  import-telegram-posts.ts
  prune-low-signal.ts
  run-evals.ts
  setup-telegram-bot.ts
  sync-telegram.ts
  download-remaining-yt.py
docs/
  roadmap.md
evals/
  alisher-core.json
data/
  bio_alisher_sadullaev.txt
  official/
  telegram_posts/
  youtube/
supabase/
  schema.sql
  migrations/
```

## License

MIT
