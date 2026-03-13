"use client";

import Image from "next/image";
import { UI_TEXT, type Language } from "@/lib/prompts";

export function AlisherAvatar({ size = "lg", lang = "en" }: { size?: "sm" | "lg"; lang?: Language }) {
  const dimensions = size === "lg" ? 80 : 32;
  const t = UI_TEXT[lang];

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <div className="relative">
        {size === "lg" && (
          <div className="animate-pulse-ring absolute -inset-3 rounded-full bg-gradient-to-r from-sky-400/15 to-emerald-400/15" />
        )}
        <Image
          src="/alisher.jpg"
          alt="Alisher Sadullaev"
          width={dimensions}
          height={dimensions}
          className="relative rounded-full object-cover ring-2 ring-[var(--border)]"
          priority={size === "lg"}
        />
      </div>
      {size === "lg" ? (
        <div className="text-center">
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Alisher Sadullaev
          </h1>
          <p
            className="mt-1 max-w-md text-[12px] leading-relaxed sm:text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            {t.heroSubtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
