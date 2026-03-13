const TELEGRAM_METADATA_PREFIXES = [
  "Telegram channel post",
  "Channel:",
  "Post ID:",
  "Date:",
  "URL:",
];

const LOW_SIGNAL_TELEGRAM_PATTERNS = [
  /^\s*.*\bpinned (?:an? |this )?(?:photo|video|voice message|message|file|sticker|poll)\b.*$/iu,
  /^\s*.*\bforwarded from\b.*$/iu,
  /^\s*.*\bjoined telegram\b.*$/iu,
  /^\s*.*\bshared a (?:photo|video|voice message)\b.*$/iu,
  /^\s*(?:https?:\/\/\S+\s*)+$/iu,
];

const LOW_SIGNAL_YOUTUBE_LINE_PATTERNS = [
  /^\s*\[(?:music|applause|laughter|music playing)\]\s*$/iu,
  /^\s*(?:music|applause|laughter|foreign|abone ol|subscribe)\s*$/iu,
  /^\s*(?:>>\s*)?\[(?:.+)\]\s*$/u,
];

export function stripTelegramBoilerplate(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !TELEGRAM_METADATA_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
    })
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function extractMeaningfulSourceText(text: string): string {
  return stripTelegramBoilerplate(text)
    .replace(/\s+/gu, " ")
    .trim();
}

export function isLowSignalTelegramContent(text: string): boolean {
  const cleaned = extractMeaningfulSourceText(text);
  if (!cleaned) return true;

  const withoutUrls = cleaned.replace(/https?:\/\/\S+/giu, " ").replace(/\s+/gu, " ").trim();
  const letterCount = (withoutUrls.match(/\p{L}/gu) || []).length;

  if (LOW_SIGNAL_TELEGRAM_PATTERNS.some((pattern) => pattern.test(withoutUrls))) {
    return true;
  }

  if (withoutUrls.length < 48 && letterCount < 28) {
    return true;
  }

  if (
    withoutUrls.length < 96 &&
    /^(?:[#@]\S+\s*)+$/u.test(withoutUrls)
  ) {
    return true;
  }

  return false;
}

export function isLowSignalChunk(content: string, sourceType: string): boolean {
  if (["telegram", "telegram_post"].includes(sourceType)) {
    return isLowSignalTelegramContent(content);
  }

  if (["youtube", "youtube_transcript"].includes(sourceType)) {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return true;

    const substantiveLines = lines.filter(
      (line) => !LOW_SIGNAL_YOUTUBE_LINE_PATTERNS.some((pattern) => pattern.test(line))
    );

    if (substantiveLines.length === 0) return true;

    const joined = substantiveLines.join(" ");
    const letters = (joined.match(/\p{L}/gu) || []).length;
    const words = joined.split(/\s+/u).filter(Boolean);
    const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
    const uniqueRatio = words.length === 0 ? 0 : uniqueWords.size / words.length;
    const mixedScriptShare =
      substantiveLines.length === 0
        ? 0
        : substantiveLines.filter(
            (line) => /[A-Za-z]/u.test(line) && /\p{Script=Cyrillic}/u.test(line)
          ).length / substantiveLines.length;

    if (letters < 120) return true;
    if (words.length > 20 && uniqueRatio < 0.22) return true;
    if (/[а-яё]/iu.test(joined) && /[a-z]/iu.test(joined) && uniqueRatio < 0.3) return true;
    if (mixedScriptShare > 0.18) return true;

    return false;
  }

  return false;
}
