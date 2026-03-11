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
  if (!["telegram", "telegram_post"].includes(sourceType)) {
    return false;
  }

  return isLowSignalTelegramContent(content);
}
