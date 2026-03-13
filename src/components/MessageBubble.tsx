"use client";

import { useState, useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { AlisherAvatar } from "./AlisherAvatar";
import type { Language } from "@/lib/prompts";
import { UI_TEXT } from "@/lib/prompts";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getSourceTypeLabel(type: string, lang: Language): string {
  switch (type) {
    case "telegram_post":
      return lang === "uz" ? "Telegram posti" : "Telegram post";
    case "telegram":
      return lang === "uz" ? "Telegram arxivi" : "Telegram";
    case "youtube":
    case "youtube_transcript":
      return "YouTube";
    case "interview":
      return lang === "uz" ? "Intervyu" : "Interview";
    case "article":
      return lang === "uz" ? "Maqola" : "Article";
    case "bio":
      return lang === "uz" ? "Profil" : "Profile";
    default:
      return type.replace(/_/g, " ");
  }
}

function getSourceActionLabel(type: string, lang: Language): string {
  switch (type) {
    case "telegram_post":
      return lang === "uz" ? "Postni ochish" : "Open post";
    case "telegram":
      return lang === "uz" ? "Kanalni ochish" : "Open channel";
    case "youtube":
    case "youtube_transcript":
      return lang === "uz" ? "Ko'rish" : "Watch";
    case "article":
      return lang === "uz" ? "O'qish" : "Read";
    default:
      return lang === "uz" ? "Ochish" : "Open";
  }
}

type SourceCard = {
  id: string;
  type: string;
  url: string;
  title: string;
  snippet?: string;
  topics: string[];
  publishedAt?: string;
};

function formatSourceTitleDate(publishedAt: string | undefined, lang: Language): string | null {
  if (!publishedAt) return null;
  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) return null;

  return new Intl.DateTimeFormat(lang === "uz" ? "uz-UZ" : "en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function getSourceHostLabel(url: string): string | null {
  if (!url.startsWith("http")) return null;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./u, "");
    const hostMap: Array<[suffix: string, label: string]> = [
      ["t.me", "Telegram"],
      ["youtube.com", "YouTube"],
      ["youtu.be", "YouTube"],
      ["kun.uz", "Kun.uz"],
      ["daryo.uz", "Daryo"],
      ["spot.uz", "Spot"],
      ["gazeta.uz", "Gazeta.uz"],
      ["anhor.uz", "Anhor.uz"],
      ["stanford.edu", "Stanford"],
      ["gsb.stanford.edu", "Stanford GSB"],
      ["ted.com", "TED"],
      ["fide.com", "FIDE"],
    ];

    for (const [suffix, label] of hostMap) {
      if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
        return label;
      }
    }

    return hostname;
  } catch {
    return null;
  }
}

function isGenericSourceTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;

  return [
    "telegram post",
    "telegram archive",
    "interview",
    "article",
    "bio",
    "youtube",
    "linkedin",
    "profile",
  ].includes(normalized) || normalized.includes("post #");
}

function getDisplaySourceTitle(source: SourceCard, lang: Language): string {
  if (source.type === "telegram_post") {
    const dateLabel = formatSourceTitleDate(source.publishedAt, lang);
    if (dateLabel) {
      return lang === "uz" ? `${dateLabel} posti` : `${dateLabel} post`;
    }
    return lang === "uz" ? "Telegram posti" : "Telegram post";
  }

  if (source.type === "telegram") {
    return lang === "uz" ? "Telegram kanali" : "Telegram channel";
  }

  if (source.title && !isGenericSourceTitle(source.title)) {
    return source.title;
  }

  const hostLabel = getSourceHostLabel(source.url);

  switch (source.type) {
    case "youtube":
    case "youtube_transcript":
      return lang === "uz" ? "YouTube chiqishi" : "YouTube talk";
    case "interview":
      return hostLabel
        ? lang === "uz"
          ? `${hostLabel} intervyusi`
          : `${hostLabel} interview`
        : lang === "uz"
          ? "Ommaviy intervyu"
          : "Public interview";
    case "article":
      return hostLabel
        ? lang === "uz"
          ? `${hostLabel} maqolasi`
          : `${hostLabel} article`
        : lang === "uz"
          ? "Ommaviy maqola"
          : "Public article";
    case "bio":
      return hostLabel
        ? lang === "uz"
          ? `${hostLabel} profili`
          : `${hostLabel} profile`
        : lang === "uz"
          ? "Qisqa profil"
          : "Profile note";
    case "linkedin_post":
      return lang === "uz" ? "LinkedIn posti" : "LinkedIn post";
    default:
      return source.title || getSourceTypeLabel(source.type, lang);
  }
}

function getTopicLabel(topic: string, lang: Language): string {
  const labels: Record<string, { en: string; uz: string }> = {
    youth: { en: "Youth", uz: "Yoshlar" },
    education: { en: "Education", uz: "Ta'lim" },
    entrepreneurship: { en: "Entrepreneurship", uz: "Tadbirkorlik" },
    volunteering: { en: "Volunteering", uz: "Volontyorlik" },
    chess: { en: "Chess", uz: "Shaxmat" },
    policy: { en: "Policy", uz: "Siyosat" },
    reading: { en: "Reading", uz: "Kitobxonlik" },
    regional_visits: { en: "Regional visits", uz: "Hududiy tashriflar" },
    leadership: { en: "Leadership", uz: "Yetakchilik" },
    technology: { en: "Technology", uz: "Texnologiya" },
    grants_finance: { en: "Grants & finance", uz: "Grant va moliya" },
    women_empowerment: { en: "Women & girls", uz: "Ayol-qizlar" },
    international: { en: "International", uz: "Xalqaro" },
  };

  return labels[topic]?.[lang] || topic.replace(/_/g, " ");
}

function shouldSuppressSources(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();

  return [
    /i haven't spoken publicly about/u,
    /i have not spoken publicly about/u,
    /that's not something i've shared/u,
    /that is not something i've shared/u,
    /i don't have any information on that/u,
    /i do not have any information on that/u,
    /bu haqda ochiq gapirmaganman/u,
    /haqida ochiq gapirmaganman/u,
    /bu mavzu bo'yicha ochiq fikr bildirganim yo'q/u,
    /ochiq fikr bildirganim yo'q/u,
    /bu haqda menda ma'lumot yo'q/u,
    /buni omma bilan ulashmaganman/u,
  ].some((pattern) => pattern.test(normalized));
}

function shouldShowFreshestSourceOnly(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();

  return [
    /i haven't shared any telegram posts/u,
    /i haven't posted on telegram/u,
    /the most recent post .*publicly available/u,
    /the latest post .*publicly available/u,
    /my most recent telegram post/u,
    /telegramda .* post ulashmaganman/u,
    /eng so'nggi .* post .* ochiq/u,
    /oxirgi .* telegram postim/u,
  ].some((pattern) => pattern.test(normalized));
}

function getSourceTimestamp(publishedAt?: string): number {
  if (!publishedAt) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(publishedAt);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function formatSourceDate(publishedAt: string | undefined, lang: Language): string | null {
  if (!publishedAt) return null;
  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) return null;

  return new Intl.DateTimeFormat(lang === "uz" ? "uz-UZ" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function getSourceFamilyLabel(family: string, lang: Language): string {
  switch (family) {
    case "telegram":
      return "Telegram";
    case "longform":
      return lang === "uz" ? "intervyu va chiqishlar" : "interviews and talks";
    case "profile":
      return lang === "uz" ? "profil materiallari" : "profile material";
    default:
      return lang === "uz" ? "ommaviy manbalar" : "public sources";
  }
}

function buildSourceContextCopy(
  context:
    | {
        latestPublishedAt?: string;
        stale?: boolean;
        limitedConfidence?: boolean;
        limitedReasonCodes?: string[];
        recencyRequested?: boolean;
        sourceFamilies: string[];
        hasMixedSources?: boolean;
      }
    | null,
  lang: Language
): { title: string; detail?: string } | null {
  if (!context) return null;

  const latestLabel = formatSourceDate(context.latestPublishedAt, lang);
  const reasons = context.limitedReasonCodes || [];

  if (context.limitedConfidence) {
    const detail =
      reasons.includes("topic_gap")
        ? lang === "uz"
          ? "Topilgan ommaviy material savolga to'liq mos tushmadi. Javobni ehtiyotkorroq o'qing."
          : "The retrieved public material only partially matches this question, so treat the answer more cautiously."
        : reasons.includes("weak_match")
          ? lang === "uz"
            ? "Bu javob kuchli mos tushgan ommaviy manbalarga emas, cheklangan kontekstga tayangan."
            : "This answer leans on limited public context rather than strongly matched sources."
          : lang === "uz"
            ? "Bu mavzu bo'yicha ommaviy kontekst cheklangan, shuning uchun javob ehtiyotkorroq berildi."
            : "Public context on this topic is limited, so the answer was kept more cautious.";

    return {
      title: lang === "uz" ? "Cheklangan ommaviy kontekst" : "Limited public context",
      detail,
    };
  }

  if (context.recencyRequested && latestLabel) {
    return {
      title:
        lang === "uz"
          ? `Eng yangi ommaviy manba: ${latestLabel}`
          : `Freshest public source: ${latestLabel}`,
      detail: context.stale
        ? lang === "uz"
          ? "Bu javob yangi yangilanish emas, mavjud eng so'nggi ommaviy materialga tayangan."
          : "This answer relies on the latest public material available here, but it is not a truly current update."
        : lang === "uz"
          ? "Javob shu to'plamdagi eng yangi ommaviy materialga tayangan."
          : "This answer is anchored to the freshest public material in this set.",
    };
  }

  if (context.hasMixedSources && context.sourceFamilies.length > 1) {
    const familyList = context.sourceFamilies
      .filter((family) => family !== "other")
      .map((family) => getSourceFamilyLabel(family, lang))
      .join(", ");

    return {
      title:
        lang === "uz"
          ? "Javob bir nechta ommaviy manbaga tayangan"
          : "Grounded in multiple public sources",
      detail:
        familyList.length > 0
          ? lang === "uz"
            ? `Bu javob ${familyList} kabi manbalarga tayangan.`
            : `This answer blends sources like ${familyList}.`
          : undefined,
    };
  }

  return null;
}

interface MessageBubbleProps {
  message: UIMessage;
  lang?: Language;
  isStreaming?: boolean;
  question?: string;
  onOutboundClick?: (url: string, linkText: string) => void;
  onShare?: (payload: {
    method: "native" | "clipboard";
    hasQuestion: boolean;
    questionLength: number;
    answerLength: number;
  }) => void;
}

function buildShareCardUrl(question: string | undefined, answer: string, lang: Language): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://askalishersadullaev.netlify.app";
  const url = new URL("/share", origin);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", "ask_alisher_answer_share");
  url.searchParams.set("lang", lang);
  if (question) {
    url.searchParams.set("q", question.trim().slice(0, 300));
  }
  url.searchParams.set("a", truncateForShare(answer, 600));
  return url.toString();
}

function truncateForShare(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}...`;
}

function buildShareText(params: {
  lang: Language;
  question?: string;
  url: string;
}) {
  const { lang, question, url } = params;
  const trimmedQuestion = question?.trim();

  if (!trimmedQuestion) {
    return lang === "uz"
      ? `Alisher Sadullaevdan bir savol so'rab ko'rdim.\n\nJavob bu yerda:\n${url}`
      : `I asked Alisher Sadullaev something interesting.\n\nSee the answer here:\n${url}`;
  }

  const lines =
    lang === "uz"
      ? [
          "Alisher Sadullaevga shu savolni berdim:",
          "",
          trimmedQuestion,
          "",
          "Javob bu yerda:",
          url,
        ]
      : [
          "I asked Alisher Sadullaev this:",
          "",
          trimmedQuestion,
          "",
          "See the answer here:",
          url,
        ];

  return lines.join("\n");
}

// SVG logo icons for source types
function SourceIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (type) {
    case "youtube":
    case "youtube_transcript":
      return (
        <svg viewBox="0 0 24 24" className={cls} style={{ color: "#FF0000" }}>
          <path fill="currentColor" d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
        </svg>
      );
    case "telegram":
    case "telegram_post":
      return (
        <svg viewBox="0 0 24 24" className={cls} style={{ color: "#26A5E4" }}>
          <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0Zm5.53 8.15-1.83 8.63c-.14.61-.5.76-.99.47l-2.76-2.03-1.33 1.28c-.15.15-.27.27-.56.27l.2-2.81 5.1-4.61c.22-.2-.05-.31-.34-.12l-6.31 3.97-2.72-.85c-.59-.18-.6-.59.12-.88l10.63-4.1c.49-.18.93.12.77.88Z" />
        </svg>
      );
    case "interview":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} style={{ color: "var(--muted)" }}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M19.5 10V7a2 2 0 0 0-2-2h-2l-1.5-2h-4L8.5 5h-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21 4v4M23 6h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "article":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} style={{ color: "var(--muted)" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "bio":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} style={{ color: "var(--muted)" }}>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls} style={{ color: "var(--muted)" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 8h10M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function MessageBubble({
  message,
  lang = "en",
  isStreaming = false,
  question,
  onOutboundClick,
  onShare,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [, tick] = useState(0);
  const t = UI_TEXT[lang];
  const [createdAt] = useState(() => Date.now());
  const shareUrlRef = useRef<string | null>(null);

  // Re-render every 60s to update timestamps
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const rawText =
    message.parts
      ?.filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text"
      )
      .map((part) => part.text)
      .join("") || "";

  // Strip the hidden language prefix so it doesn't show in the bubble
  const text = isUser
    ? rawText.replace(/^\[Respond in Uzbek \/ O'zbek tilida javob bering\]\n/, "")
    : rawText;

  // Extract sources from source-url parts
  const sources: SourceCard[] = [];
  if (!isUser && message.parts) {
    for (const part of message.parts) {
      if (part.type === "source-url") {
        const src = part as {
          type: "source-url";
          sourceId: string;
          sourceType?: string;
          url?: string;
          title?: string;
          snippet?: string;
          topics?: string[];
          publishedAt?: string;
        };
        sources.push({
          id: src.sourceId,
          type: src.sourceType || src.sourceId,
          url: typeof src.url === "string" ? src.url : "",
          title: src.title || src.sourceId,
          snippet: typeof src.snippet === "string" ? src.snippet : undefined,
          topics: Array.isArray(src.topics)
            ? src.topics.filter((topic): topic is string => typeof topic === "string" && topic.length > 0)
            : [],
          publishedAt: typeof src.publishedAt === "string" ? src.publishedAt : undefined,
        });
      }
    }
  }
  const sourceContext =
    !isUser && message.parts
      ? (
          message.parts.find((part) => part.type === "source-context") as
            | {
                type: "source-context";
                latestPublishedAt?: string;
                stale?: boolean;
                limitedConfidence?: boolean;
                limitedReasonCodes?: string[];
                recencyRequested?: boolean;
                sourceFamilies?: string[];
                hasMixedSources?: boolean;
              }
            | undefined
        )
      : undefined;

  const suppressSources = !isUser && shouldSuppressSources(text);
  const baseSources = suppressSources
    ? []
    : sources.some((source) => source.type === "telegram_post")
      ? sources.filter((source) => source.type !== "telegram")
      : sources;
  const sourceContextCopy =
    !isUser && baseSources.length > 0
      ? buildSourceContextCopy(
          sourceContext
            ? {
                latestPublishedAt: sourceContext.latestPublishedAt,
                stale: sourceContext.stale,
                limitedConfidence: sourceContext.limitedConfidence,
                limitedReasonCodes: Array.isArray(sourceContext.limitedReasonCodes) ? sourceContext.limitedReasonCodes : [],
                recencyRequested: sourceContext.recencyRequested,
                sourceFamilies: Array.isArray(sourceContext.sourceFamilies) ? sourceContext.sourceFamilies : [],
                hasMixedSources: sourceContext.hasMixedSources,
              }
            : null,
          lang
        )
      : null;
  const displaySources =
    !isUser && shouldShowFreshestSourceOnly(text)
      ? (() => {
          const freshestSource = [...baseSources].sort(
            (left, right) => getSourceTimestamp(right.publishedAt) - getSourceTimestamp(left.publishedAt)
          )[0];
          return freshestSource ? [freshestSource] : baseSources;
        })()
      : baseSources;

  const timestamp = timeAgo(new Date(createdAt));

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    if (sharing) return;

    setSharing(true);
    try {
      let shareUrl = shareUrlRef.current;

      if (!shareUrl) {
        try {
          const response = await fetch("/api/share", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              question: question || "",
              answer: text,
              lang,
            }),
          });

          if (response.ok) {
            const payload = (await response.json()) as { url?: string };
            if (payload.url) {
              const origin =
                typeof window !== "undefined" && window.location.origin
                  ? window.location.origin
                  : "https://askalishersadullaev.netlify.app";
              shareUrl = new URL(payload.url, origin).toString();
            }
          }
        } catch {
          // Fall through to the stateless share URL below.
        }
      }

      if (!shareUrl) {
        shareUrl = buildShareCardUrl(question, text, lang);
      }

      shareUrlRef.current = shareUrl;

      const shareText = buildShareText({
        lang,
        question,
        url: shareUrl,
      });
      const shareData = {
        text: shareText,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          onShare?.({
            method: "native",
            hasQuestion: Boolean(question?.trim()),
            questionLength: question?.trim().length || 0,
            answerLength: text.trim().length,
          });
        } catch {
          // User cancelled share
        }
      } else {
        await navigator.clipboard.writeText(shareText);
        onShare?.({
          method: "clipboard",
          hasQuestion: Boolean(question?.trim()),
          questionLength: question?.trim().length || 0,
          answerLength: text.trim().length,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } finally {
      setSharing(false);
    }
  }

  if (!text) return null;

  const trackOutboundClick = (url: string, linkText: string) => {
    if (!url || !onOutboundClick) return;
    onOutboundClick(url, linkText);
  };

  return (
    <div
      className={`group animate-fade-in flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="mt-1 shrink-0">
          <AlisherAvatar size="sm" />
        </div>
      )}

      <div className="flex max-w-[92%] flex-col gap-1 sm:max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
          style={
            isUser
              ? { background: "var(--user-bubble)", color: "var(--user-text)" }
              : {
                  background: "var(--ai-bubble)",
                  color: "var(--ai-text)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  border: "1px solid var(--border)",
                }
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <div className="prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0" style={{ color: "inherit" }}>
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold" style={{ color: "inherit" }}>
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ color: "inherit" }}>{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ color: "inherit" }}>{children}</li>
                  ),
                  h1: ({ children }) => (
                    <h3 className="mb-2 mt-4 text-base font-bold first:mt-0" style={{ color: "inherit" }}>
                      {children}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="mb-2 mt-4 text-base font-bold first:mt-0" style={{ color: "inherit" }}>
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0" style={{ color: "inherit" }}>
                      {children}
                    </h4>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote
                      className="my-2 border-l-2 pl-3 italic"
                      style={{ borderColor: "var(--border)", opacity: 0.85 }}
                    >
                      {children}
                    </blockquote>
                  ),
                  hr: () => null,
                  code: ({ children }) => (
                    <code
                      className="rounded px-1 py-0.5 text-[13px]"
                      style={{ background: "var(--border)" }}
                    >
                      {children}
                    </code>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                      style={{ color: "var(--input-focus)" }}
                      onClick={() => trackOutboundClick(href || "", typeof children === "string" ? children : "Answer link")}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}

          {/* Expandable sources toggle */}
          {displaySources.length > 0 && !isStreaming && (
            <div className="mt-2 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
              {sourceContextCopy && (
                <div
                  className="mb-2 rounded-xl border px-3 py-2 text-[11px]"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--suggestion-bg)",
                    color: "var(--foreground)",
                  }}
                >
                  <div className="font-medium">{sourceContextCopy.title}</div>
                  {sourceContextCopy.detail && (
                    <div className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
                      {sourceContextCopy.detail}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setSourcesOpen((o) => !o)}
                className="flex w-full items-center gap-1.5 py-1 text-[11px] transition-opacity hover:opacity-80"
                style={{ color: "var(--muted)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" style={{ opacity: 0.6 }}>
                  <path fillRule="evenodd" d="M4.5 13a3.5 3.5 0 0 1-.41-6.97A4.5 4.5 0 0 1 8.5 2a4.5 4.5 0 0 1 4.41 4.03A3.5 3.5 0 0 1 11.5 13h-7Z" clipRule="evenodd" />
                </svg>
                {lang === "uz" ? "Manbalar" : "Sources"}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: "var(--suggestion-bg)", color: "var(--foreground)" }}
                >
                  {displaySources.length}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3 transition-transform duration-200"
                  style={{
                    transform: sourcesOpen ? "rotate(180deg)" : "rotate(0deg)",
                    opacity: 0.5,
                  }}
                >
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {sourcesOpen && (
                <div className="mt-1.5 flex flex-col gap-1.5 animate-fade-in">
                  {displaySources.map((s) => {
                    const displayTitle = getDisplaySourceTitle(s, lang);
                    const isLink = s.url.startsWith("http");
                    return isLink ? (
                      <a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-colors"
                        style={{
                          color: "var(--muted)",
                          textDecoration: "none",
                          borderColor: "var(--border)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--suggestion-hover)";
                          e.currentTarget.style.color = "var(--foreground)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                        onClick={() => trackOutboundClick(s.url, displayTitle)}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ background: "var(--suggestion-bg)" }}
                        >
                          <SourceIcon type={s.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[12px] font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {displayTitle}
                          </div>
                          <div
                            className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]"
                            style={{ opacity: 0.72 }}
                          >
                            <span>{getSourceTypeLabel(s.type, lang)}</span>
                            {formatSourceDate(s.publishedAt, lang) && (
                              <>
                                <span aria-hidden="true">•</span>
                                <span>{formatSourceDate(s.publishedAt, lang)}</span>
                              </>
                            )}
                          </div>
                          {s.snippet && (
                            <div
                              className="mt-1 line-clamp-3 text-[10px] leading-relaxed"
                              style={{ color: "var(--muted)" }}
                            >
                              {s.snippet}
                            </div>
                          )}
                          {s.topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {s.topics.map((topic) => (
                                <span
                                  key={`${s.id}:${topic}`}
                                  className="rounded-full px-1.5 py-0.5 text-[9px]"
                                  style={{
                                    background: "var(--suggestion-bg)",
                                    color: "var(--foreground)",
                                  }}
                                >
                                  {getTopicLabel(topic, lang)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1 text-[10px]" style={{ opacity: 0.66 }}>
                          <span>{getSourceActionLabel(s.type, lang)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5">
                            <path d="M5.25 3.5a.75.75 0 0 0 0 1.5h3.69L3.97 9.97a.75.75 0 1 0 1.06 1.06L10 6.06v3.69a.75.75 0 0 0 1.5 0v-5.5a.75.75 0 0 0-.75-.75h-5.5Z" />
                          </svg>
                        </div>
                      </a>
                    ) : (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]"
                        style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ background: "var(--suggestion-bg)" }}
                        >
                          <SourceIcon type={s.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[12px] font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {displayTitle}
                          </div>
                          <div
                            className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]"
                            style={{ opacity: 0.72 }}
                          >
                            <span>{getSourceTypeLabel(s.type, lang)}</span>
                            {formatSourceDate(s.publishedAt, lang) && (
                              <>
                                <span aria-hidden="true">•</span>
                                <span>{formatSourceDate(s.publishedAt, lang)}</span>
                              </>
                            )}
                          </div>
                          {s.snippet && (
                            <div
                              className="mt-1 line-clamp-3 text-[10px] leading-relaxed"
                              style={{ color: "var(--muted)" }}
                            >
                              {s.snippet}
                            </div>
                          )}
                          {s.topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {s.topics.map((topic) => (
                                <span
                                  key={`${s.id}:${topic}`}
                                  className="rounded-full px-1.5 py-0.5 text-[9px]"
                                  style={{
                                    background: "var(--suggestion-bg)",
                                    color: "var(--foreground)",
                                  }}
                                >
                                  {getTopicLabel(topic, lang)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp + action buttons for AI messages */}
        <div className={`flex items-center gap-1.5 ${isUser ? "justify-end" : ""}`}>
          <span
            className="text-[11px] sm:text-[10px]"
            style={{ color: "var(--muted)", opacity: 0.5 }}
          >
            {timestamp}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--suggestion-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    {t.copied}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
                      <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
                    </svg>
                    {t.copy}
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--suggestion-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                  <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9.414l-1-1H12V3H4v2h1.586l-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8Z" />
                  <path d="M5.354 9.354a.5.5 0 0 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 7.207V14a.5.5 0 0 1-1 0V7.207L5.354 9.354Z" />
                </svg>
                {sharing ? t.sharing : t.share}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
