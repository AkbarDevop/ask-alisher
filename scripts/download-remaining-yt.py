"""
Manifest-driven transcript downloader for public Alisher Sadullaev videos.

Run:
  python3 scripts/download-remaining-yt.py
  python3 scripts/download-remaining-yt.py --priority high
  python3 scripts/download-remaining-yt.py --limit 5
"""

import argparse
import json
import os
import time
from youtube_transcript_api import YouTubeTranscriptApi

api = YouTubeTranscriptApi()
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "data", "youtube")
MANIFEST = os.path.join(os.path.dirname(__file__), "alisher-video-manifest.json")
os.makedirs(OUTDIR, exist_ok=True)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--priority", choices=["all", "high", "medium"], default="all")
    parser.add_argument("--limit", type=int, default=0)
    return parser.parse_args()


def load_manifest():
    with open(MANIFEST, "r", encoding="utf-8") as handle:
        return json.load(handle)


def pick_transcript(video_id):
    transcripts = list(api.list(video_id))
    if not transcripts:
        return None

    preferred = {"uz": 0, "ru": 1, "en": 2, "tr": 3, "ro": 4}
    transcripts.sort(key=lambda item: preferred.get(item.language_code, 100))
    return transcripts[0]


args = parse_args()
videos = load_manifest()
if args.priority != "all":
    videos = [video for video in videos if video.get("priority") == args.priority]

existing = {f.replace(".txt", "") for f in os.listdir(OUTDIR) if f.endswith(".txt")}
to_download = [video for video in videos if video["id"] not in existing]
if args.limit > 0:
    to_download = to_download[: args.limit]

print(f"Already have {len(existing)} transcript file(s), need {len(to_download)} more.\n")

success = 0
skipped = []

for index, video in enumerate(to_download, start=1):
    video_id = video["id"]
    title = video["title"]
    channel = video["channel"]
    kind = video.get("kind", "interview")

    try:
        transcript = pick_transcript(video_id)
        if transcript is None:
            skipped.append(video_id)
            print(f"  SKIP [{index}] {title[:50]}... — no transcript found")
            continue

        entries = transcript.fetch()
        text = "\n".join(snippet.text for snippet in entries)

        with open(os.path.join(OUTDIR, f"{video_id}.txt"), "w", encoding="utf-8") as handle:
            handle.write(f'Source: YouTube — Alisher Sadullaev on {channel} — "{title}"\n')
            handle.write(f"URL: https://www.youtube.com/watch?v={video_id}\n")
            handle.write(f"Channel: {channel}\n")
            handle.write(f"Kind: {kind}\n")
            handle.write(f"Language: {transcript.language_code}\n\n")
            handle.write(text)

        success += 1
        print(f"  OK [{index}/{len(to_download)}] {title[:50]}... ({len(text):,} chars)")
    except Exception as exc:
        skipped.append(video_id)
        print(f"  ERR [{index}] {title[:50]}... — {type(exc).__name__}: {exc}")

    time.sleep(4)

print(f"\nDone: {success}/{len(to_download)} downloaded")
if skipped:
    print("Skipped:", ", ".join(skipped))

print("\nThen ingest only the YouTube updates:")
print("  cd /Users/akbar/Desktop/ask-alisher")
print("  source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts --prefix=youtube/ --skip-clear")
