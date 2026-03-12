import type { Metadata } from "next";
import Link from "next/link";
import { ShareExperience } from "@/components/ShareExperience";
import { UI_TEXT } from "@/lib/prompts";
import { fetchShareRecord, truncateShareText } from "@/lib/share";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function buildShareImageUrl(id: string) {
  return `/share/${id}/opengraph-image`;
}

function buildSharePageUrl(id: string) {
  return `/share/${id}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await fetchShareRecord(id);

  if (!payload) {
    return {
      title: "Shared answer not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${truncateShareText(payload.question, 68)} · Ask Alisher`;
  const description = truncateShareText(payload.answer, 160);
  const imageUrl = buildShareImageUrl(payload.id);

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
      url: buildSharePageUrl(payload.id),
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

export default async function ShareByIdPage({ params }: PageProps) {
  const { id } = await params;
  const payload = await fetchShareRecord(id);

  if (!payload) {
    const t = UI_TEXT.en;
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
          <h1 className="mb-3 text-2xl font-semibold">Shared answer unavailable</h1>
          <p className="mb-6 text-sm leading-6" style={{ color: "var(--muted)" }}>
            This short share link no longer resolves to a saved answer.
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
      sharePageUrl={buildSharePageUrl(payload.id)}
      shareImageUrl={buildShareImageUrl(payload.id)}
    />
  );
}
