import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShareCardActions } from "@/components/ShareCardActions";
import { UI_TEXT, type Language } from "@/lib/prompts";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    a?: string | string[];
    lang?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeLang(value: string): Language {
  return value === "uz" ? "uz" : "en";
}

function cleanQuestion(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 300);
}

function cleanAnswer(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()
    .slice(0, 1200);
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}...`;
}

function buildShareImageUrl(question: string, answer: string, lang: Language) {
  const params = new URLSearchParams({
    q: question,
    a: answer,
    lang,
  });
  return `/api/share-image?${params.toString()}`;
}

function buildSharePageUrl(question: string, answer: string, lang: Language) {
  const params = new URLSearchParams({
    q: question,
    a: answer,
    lang,
    utm_source: "share",
    utm_medium: "organic",
    utm_campaign: "ask_alisher_answer_share",
  });
  return `/share?${params.toString()}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const question = cleanQuestion(getSingleValue(params.q));
  const answer = cleanAnswer(getSingleValue(params.a));
  const lang = normalizeLang(getSingleValue(params.lang));

  if (!question || !answer) {
    return {
      title: "Shared answer not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${truncate(question, 68)} · Ask Alisher`;
  const description = truncate(answer, 160);
  const imageUrl = buildShareImageUrl(question, answer, lang);

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: buildSharePageUrl(question, answer, lang),
      siteName: "Ask Alisher",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const question = cleanQuestion(getSingleValue(params.q));
  const answer = cleanAnswer(getSingleValue(params.a));
  const lang = normalizeLang(getSingleValue(params.lang));
  const t = UI_TEXT[lang];

  if (!question || !answer) {
    return (
      <main className="chat-bg flex min-h-screen items-center justify-center px-4">
        <div
          className="max-w-md rounded-[28px] border p-8 text-center"
          style={{
            background: "var(--ai-bubble)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Ask Alisher
          </p>
          <h1 className="mb-3 text-2xl font-semibold">Shared answer unavailable</h1>
          <p className="mb-6 text-sm leading-6" style={{ color: "var(--muted)" }}>
            This shared link is missing the question or answer preview.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{ background: "var(--user-bubble)", color: "var(--user-text)" }}
          >
            {t.backToHome}
          </Link>
        </div>
      </main>
    );
  }

  const answerParagraphs = answer.split(/\n{2,}/u).filter(Boolean);
  const askUrl = `/?q=${encodeURIComponent(question)}&lang=${lang}&fresh=1&utm_source=share_card&utm_medium=organic&utm_campaign=ask_alisher_answer_share`;
  const sharePageUrl = buildSharePageUrl(question, answer, lang);
  const shareImageUrl = buildShareImageUrl(question, answer, lang);

  return (
    <main className="flex min-h-screen flex-col" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-10 backdrop-blur-xl"
        style={{
          background: "var(--footer-bar)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-75">
            <Image
              src="/alisher.jpg"
              alt="Alisher Sadullaev"
              width={28}
              height={28}
              className="rounded-full ring-1 ring-[var(--border)]"
            />
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
              Ask Alisher
            </span>
          </Link>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {t.sharedAnswerPreview}
          </span>
        </div>
      </header>

      <div className="chat-bg flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-4 sm:pb-32 sm:pt-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="hero-glow relative flex flex-col items-center gap-4 pt-6 text-center sm:pt-10">
            <div className="relative">
              <Image
                src="/alisher.jpg"
                alt="Alisher Sadullaev"
                width={88}
                height={88}
                className="rounded-full ring-1 ring-[var(--border)]"
              />
              <div
                className="animate-pulse-ring absolute inset-0 rounded-full"
                style={{ border: "1px solid rgba(59, 130, 246, 0.18)" }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--muted)" }}>
                Ask Alisher
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--foreground)" }}>
                {question}
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-6 sm:text-[15px]" style={{ color: "var(--muted)" }}>
                {t.sharedAnswerPreview}
              </p>
            </div>
          </div>

          <div className="flex animate-fade-in gap-3">
            <div className="mt-1 shrink-0">
              <Image
                src="/alisher.jpg"
                alt="Alisher Sadullaev"
                width={32}
                height={32}
                className="rounded-full ring-1 ring-[var(--border)]"
              />
            </div>
            <div className="flex max-w-[92%] flex-col gap-1 sm:max-w-[80%]">
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-4 text-[14px] leading-relaxed"
                style={{
                  background: "var(--ai-bubble)",
                  color: "var(--ai-text)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="mb-3 flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ background: "var(--suggestion-bg)", color: "var(--foreground)" }}
                  >
                    {t.shareQuestionLabel}
                  </span>
                  <span>{question}</span>
                </div>
                <div className="space-y-4">
                  {answerParagraphs.map((paragraph, index) => (
                    <p key={`${question}:${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              background: "var(--suggestion-bg)",
              borderColor: "var(--border)",
            }}
          >
            <div className="mb-4 flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                Organic share
              </p>
              <p className="text-sm leading-6" style={{ color: "var(--foreground)" }}>
                Share an interesting question-answer pair, let someone preview it cleanly, then move them straight into chat.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={askUrl}
                className="rounded-2xl px-4 py-3 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--user-bubble)", color: "var(--user-text)" }}
              >
                {t.openSharedChat}
              </Link>
              <Link
                href="/"
                className="rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                {t.backToHome}
              </Link>
            </div>

            <div className="mt-3">
              <ShareCardActions lang={lang} shareUrl={sharePageUrl} imageUrl={shareImageUrl} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
