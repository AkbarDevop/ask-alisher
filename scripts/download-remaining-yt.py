"""
Starter transcript downloader for public Alisher Sadullaev videos.

Run:
  python3 scripts/download-remaining-yt.py

It downloads a small set of high-signal interviews/talks into data/youtube/.
Expand VIDEOS as you discover more public material.
"""

from youtube_transcript_api import YouTubeTranscriptApi
import os
import time

api = YouTubeTranscriptApi()
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "data", "youtube")
os.makedirs(OUTDIR, exist_ok=True)

VIDEOS = {
    "Ie4jP-wGKBA": ("The power of positive attitude", "TEDx Talks"),
    "woGHbTfjIJA": ('"Chess is becoming like football in Uzbekistan"', "FIDE chess"),
    "Hv0FCYfztBs": ("Stanford kundaligi", "Millat Umidi by Umidjon Ishmukhamedov"),
    "yMDQjDpr8Yw": ("IELTS imtihonidan 8 ball olgan eng yosh Senator", "MFaktorUz"),
    "eZWmh98Ex60": ("Uyini sotgani, poytaxtga kelishi va hayotdagi printsipi haqida", "Qalampir UZ"),
    "zFnSP_evOFg": ('"Qishloqqa ham kelasizmi, Alisher Sa\'dullayev?"', "Alisher Sadullaev"),
    "I9JhGpfrwog": ('"Nahotki Alisher aka?"', "Alisher Sadullaev"),
    "BfcCoXlP83o": ("1093", "Alisher Sadullaev"),
}


def pick_transcript(video_id):
    transcripts = list(api.list(video_id))
    if not transcripts:
        return None

    preferred = {"uz": 0, "ru": 1, "en": 2, "tr": 3, "ro": 4}
    transcripts.sort(key=lambda item: preferred.get(item.language_code, 100))
    return transcripts[0]


existing = {f.replace(".txt", "") for f in os.listdir(OUTDIR) if f.endswith(".txt")}
to_download = {k: v for k, v in VIDEOS.items() if k not in existing}

print(f"Already have {len(existing)} transcript file(s), need {len(to_download)} more.\n")

success = 0
skipped = []

for index, (video_id, (title, channel)) in enumerate(to_download.items(), start=1):
    try:
        transcript = pick_transcript(video_id)
        if transcript is None:
            skipped.append(video_id)
            print(f"  SKIP [{index}] {title[:50]}... — no transcript found")
            continue

        entries = transcript.fetch()
        text = "\n".join(snippet.text for snippet in entries)

        with open(os.path.join(OUTDIR, f"{video_id}.txt"), "w", encoding="utf-8") as f:
            f.write(f'Source: YouTube — Alisher Sadullaev on {channel} — "{title}"\n')
            f.write(f"URL: https://www.youtube.com/watch?v={video_id}\n")
            f.write(f"Channel: {channel}\n")
            f.write(f"Language: {transcript.language_code}\n\n")
            f.write(text)

        success += 1
        print(f"  OK [{index}/{len(to_download)}] {title[:50]}... ({len(text):,} chars)")
    except Exception as exc:
        skipped.append(video_id)
        print(f"  ERR [{index}] {title[:50]}... — {type(exc).__name__}: {exc}")

    time.sleep(4)

print(f"\nDone: {success}/{len(to_download)} downloaded")
if skipped:
    print("Skipped:", ", ".join(skipped))

print("\nThen re-run ingestion:")
print("  cd /Users/akbar/Desktop/ask-alisher")
print("  source <(grep -v '^#' .env.local | grep '=' | sed 's/^/export /') && npx tsx scripts/chunk-and-embed.ts")
