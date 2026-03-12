import type { Metadata } from "next";
import Link from "next/link";
import { ShareExperience } from "@/components/ShareExperience";
import { UI_TEXT } from "@/lib/prompts";
import {
  buildLegacyShareImageUrl,
  buildLegacySharePageUrl,
  getSharePayloadFromSearchParams,
  normalizeLang,
  truncateShareText,
} from "@/lib/share";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    a?: string | string[];
    lang?: string | string[];
  }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const payload = getSharePayloadFromSearchParams(resolvedSearchParams);

  if (!payload) {
    const lang = normalizeLang(
      Array.isArray(resolvedSearchParams.lang)
        ? resolvedSearchParams.lang[0] || ""
        : resolvedSearchParams.lang || ""
    );
    const t = UI_TEXT[lang];

    return {
      title: t.shareNotFoundMetaTitle,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${truncateShareText(payload.question, 68)} · Ask Alisher`;
  const description = truncateShareText(payload.answer, 160);
  const imageUrl = buildLegacyShareImageUrl(payload);

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
      url: buildLegacySharePageUrl(payload),
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
  const resolvedSearchParams = await searchParams;
  const payload = getSharePayloadFromSearchParams(resolvedSearchParams);

  if (!payload) {
    const lang = normalizeLang(
      Array.isArray(resolvedSearchParams.lang)
        ? resolvedSearchParams.lang[0] || ""
        : resolvedSearchParams.lang || ""
    );
    const t = UI_TEXT[lang];
    return (
      <main className="chat-bg flex min-h-screen items-center justify-center px-4">
        <div
          data-theme="dark"
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
          <h1 className="mb-3 text-2xl font-semibold">{t.shareUnavailableTitle}</h1>
          <p className="mb-6 text-sm leading-6" style={{ color: "var(--muted)" }}>
            {t.shareUnavailableDescription}
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

  return (
    <ShareExperience
      question={payload.question}
      answer={payload.answer}
      lang={payload.lang}
      sharePageUrl={buildLegacySharePageUrl(payload)}
      shareImageUrl={buildLegacyShareImageUrl(payload)}
    />
  );
}
