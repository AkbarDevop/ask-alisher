import Image from "next/image";
import Link from "next/link";
import { ShareCardActions } from "@/components/ShareCardActions";
import { UI_TEXT, type Language } from "@/lib/prompts";

type ShareExperienceProps = {
  question: string;
  answer: string;
  lang: Language;
  sharePageUrl: string;
  shareImageUrl: string;
};

export function ShareExperience({
  question,
  answer,
  lang,
  sharePageUrl,
  shareImageUrl,
}: ShareExperienceProps) {
  const t = UI_TEXT[lang];
  const answerParagraphs = answer.split(/\n{2,}/u).filter(Boolean);
  const askUrl = `/?q=${encodeURIComponent(question)}&lang=${lang}&fresh=1&utm_source=share_card&utm_medium=organic&utm_campaign=ask_alisher_answer_share`;

  return (
    <main
      data-theme="dark"
      className="flex min-h-screen flex-col"
      style={{ background: "var(--background)" }}
    >
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
