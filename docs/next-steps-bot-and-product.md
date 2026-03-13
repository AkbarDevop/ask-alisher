## Bot next steps

### High priority

- Stabilize the `/recent` answer format into a fixed structure:
  - latest public date
  - 3 main themes
  - short takeaway
- Add a Telegram-specific analytics view:
  - top bot questions
  - quick-action usage
  - feedback ratio
  - source-click distribution
  - response latency
- Improve low-confidence handling:
  - say clearly when the newest public material is old
  - avoid confident but thin answers when retrieval is weak
- Make Telegram source buttons more human:
  - date-first labels for posts
  - clearer labels for interviews and talks

### Medium priority

- Add voice-message support:
  - transcribe Telegram voice notes
  - answer back in text first
- Add a dedicated `/about` command for a short bot introduction
- Add a dedicated `/share` flow from Telegram to the web share page
- Tune Telegram answers to be slightly shorter and more structured than web answers by default

## Non-bot product next steps

### High priority

- Improve retrieval trust on the main site:
  - stronger stale-source fallback
  - clearer handling when the newest source is old
  - better broad-question balancing across Telegram, interviews, and profile material
- Add a dedicated “freshness” answer mode on the web:
  - latest public date
  - latest themes
  - freshest supporting sources
- Expand long-form public-source coverage:
  - interviews
  - talks
  - panels
  - articles
- Build a stronger source presentation layer:
  - cleaner source titles
  - better snippets
  - more obvious difference between Telegram posts and long-form sources

### Medium priority

- Add a dedicated Telegram analytics section to `/admin/analytics`
- Add source-level performance reporting:
  - which sources are retrieved most
  - which sources get clicked most
  - which source types correlate with better answers
- Improve evaluation coverage:
  - bot-specific evals
  - freshness evals
  - unsupported-topic evals
- Add better answer templates for list-like topics:
  - opportunities
  - grants
  - programs
  - initiatives

## Suggested implementation order

1. `/recent` fixed structure
2. low-confidence / stale-source fallback
3. Telegram analytics section
4. source-label cleanup
5. long-form source expansion
6. voice-message support
