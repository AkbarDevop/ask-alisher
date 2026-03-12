"use client";

import { useState } from "react";
import type { Language } from "@/lib/prompts";
import { UI_TEXT } from "@/lib/prompts";

type ShareCardActionsProps = {
  lang: Language;
  shareUrl: string;
  imageUrl: string;
};

export function ShareCardActions({ lang, shareUrl, imageUrl }: ShareCardActionsProps) {
  const [copied, setCopied] = useState(false);
  const t = UI_TEXT[lang];

  async function handleCopyLink() {
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(shareUrl, window.location.origin).toString() : shareUrl;
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={imageUrl}
        download="ask-alisher-share-card.png"
        className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: "var(--border)",
          background: "var(--suggestion-bg)",
          color: "var(--foreground)",
        }}
      >
        {t.downloadImage}
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: "var(--border)",
          background: "var(--suggestion-bg)",
          color: "var(--foreground)",
        }}
      >
        {copied ? t.linkCopied : t.copyLink}
      </button>
    </div>
  );
}
