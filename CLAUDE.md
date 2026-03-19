# Ask Alisher Sadullaev

## gstack

Use the /browse skill from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

Available skills:
- `/office-hours` — YC-style brainstorming. Startup mode or builder mode.
- `/plan-ceo-review` — Founder/CEO mode. Rethink the problem, find the 10-star product.
- `/plan-eng-review` — Eng manager mode. Lock architecture, data flow, edge cases, tests.
- `/plan-design-review` — Designer's eye plan review. Rate design dimensions, fix gaps.
- `/design-consultation` — Create a design system and DESIGN.md from scratch.
- `/design-review` — Visual QA audit on live site. Find and fix visual issues.
- `/review` — Paranoid staff engineer. Find bugs that pass CI but break production.
- `/ship` — Release engineer. Sync main, run tests, push, open PR.
- `/browse` — QA engineer. Browser automation — navigate, screenshot, test flows.
- `/qa` — Systematic QA testing + fix loop with before/after evidence.
- `/qa-only` — QA report only, no fixes.
- `/debug` — Systematic debugging with root cause investigation.
- `/retro` — Engineering manager. Analyze commit history and shipping velocity.
- `/document-release` — Post-ship docs update. Sync README/CHANGELOG/CLAUDE.md.
- `/setup-browser-cookies` — Import real browser cookies for authenticated testing.

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.
