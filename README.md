<div align="center">

<img src="public/alisher.jpg" width="120" height="120" style="border-radius: 50%;" alt="Alisher Sadullaev" />

# Ask Alisher

**Chat with an AI clone of Alisher Sadullaev** — grounded in his public Telegram posts, interviews, talks, and other public-source material.

</div>

---

## What is this?

`ask-alisher` is a retrieval-augmented chat app built from the same architecture as `ask-akmal`, but adapted for Alisher Sadullaev.

The bot is designed to answer questions in Alisher's public voice using only retrieved context from:

- the verified public `@alisher_sadullaev` Telegram archive
- public YouTube interviews and talks
- short public bio/profile material

It is best suited for questions about youth development, education, entrepreneurship, volunteering, regional initiatives, reading culture, and chess.

## How it works

```text
User question -> Gemini embedding -> pgvector similarity search -> date-aware Telegram retrieval -> Gemini 2.5 Flash -> streamed response with source cards
```

1. Public-source documents are chunked and embedded into `documents_alisher` in Supabase.
2. The API route retrieves semantically similar chunks, with extra Telegram handling for recent/date-specific prompts.
3. Gemini 2.5 Flash generates the answer using only retrieved context.
4. The client streams the answer and renders source cards separately.

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
```

Important:

- This repo is already isolated to the `documents_alisher` table and `match_alisher_documents()` RPC.
- It can share the same Supabase project as `ask-akmal` without overwriting `documents`.
- `scripts/chunk-and-embed.ts` rebuilds only the `documents_alisher` corpus.
- GTM is wired through `NEXT_PUBLIC_GTM_ID`, defaulting to `GTM-N3M3DLLG` for the Alisher site.
- GA4 is wired through `NEXT_PUBLIC_GA_MEASUREMENT_IDS`, defaulting to `G-BWTQB4SFP4,G-2XNF6BSJG8`.

## Database

Push the included Supabase migrations:

```bash
npx supabase db push
```

## Collect data

Fetch the verified Telegram archive snapshot:

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

Ingest only the updated YouTube transcripts without rebuilding the whole corpus:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts --prefix=youtube/ --skip-clear
```

Or rebuild everything under `data/`:

```bash
source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Repo notes

- Telegram sync defaults are already pointed at `@alisher_sadullaev`.
- The UI, prompt pack, and metadata are adapted for Alisher Sadullaev.
- A small verified bio seed file is included in `data/`.
- The YouTube downloader now reads from `scripts/alisher-video-manifest.json`.
- The current roadmap is tracked in `docs/roadmap.md`.

## Project structure

```text
src/
  app/
  components/
  lib/
scripts/
  alisher-video-manifest.json
  chunk-and-embed.ts
  fetch-telegram-channel.ts
  import-telegram-posts.ts
  sync-telegram.ts
  download-remaining-yt.py
docs/
  roadmap.md
data/
  bio_alisher_sadullaev.txt
  telegram_posts/
  youtube/
supabase/
  schema.sql
  migrations/
```

## License

MIT
