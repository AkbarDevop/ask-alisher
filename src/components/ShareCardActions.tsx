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
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={imageUrl}
        download="ask-alisher-share-card.png"
        className="rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-colors"
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
        className="rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-colors"
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
