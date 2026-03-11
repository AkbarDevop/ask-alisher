import type { Metadata } from "next";
import Link from "next/link";
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
      url: `/share?${new URLSearchParams({ q: question, a: answer, lang }).toString()}`,
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
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-slate-500">Ask Alisher</p>
          <h1 className="mb-3 text-2xl font-semibold text-slate-900">Shared answer unavailable</h1>
          <p className="mb-6 text-sm leading-6 text-slate-600">
            This shared link is missing the question or answer preview.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            {t.backToHome}
          </Link>
        </div>
      </main>
    );
  }

  const answerParagraphs = answer.split(/\n{2,}/u).filter(Boolean);
  const askUrl = `/?q=${encodeURIComponent(question)}&lang=${lang}&fresh=1&utm_source=share_card&utm_medium=organic&utm_campaign=ask_alisher_answer_share`;

  return (
    <main
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-10"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.14), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs text-slate-500 shadow-sm backdrop-blur">
          <span className="font-semibold tracking-[0.16em] text-slate-700 uppercase">Ask Alisher</span>
          <span>Shared answer preview</span>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#22c55e_100%)] px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em]">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Ask Alisher
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-sky-100">
              {t.shareQuestionLabel}
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              {question}
            </h1>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_280px]">
            <div className="px-6 py-7 sm:px-10 sm:py-9">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                {t.shareAnswerLabel}
              </div>
              <div className="space-y-4 text-[15px] leading-7 text-slate-700 sm:text-[17px]">
                {answerParagraphs.map((paragraph, index) => (
                  <p key={`${question}:${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>

            <aside className="flex flex-col justify-between border-t border-slate-200 bg-slate-50 px-6 py-7 lg:border-l lg:border-t-0">
              <div>
                <div className="mb-4 rounded-3xl bg-[linear-gradient(160deg,#e0f2fe_0%,#dbeafe_55%,#dcfce7_100%)] p-5 text-slate-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Organic share
                  </p>
                  <p className="text-sm leading-6">
                    Share an interesting question-answer pair, then let the next person jump straight into chat.
                  </p>
                </div>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>Language: {lang === "uz" ? "Uzbek" : "English"}</p>
                  <p>Preview mode: rich share card</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href={askUrl}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  {t.openSharedChat}
                </Link>
                <Link
                  href="/"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.backToHome}
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
