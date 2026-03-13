"use client";

import Image from "next/image";
import type { Language } from "@/lib/prompts";

export function AlisherAvatar({ size = "lg", lang = "en" }: { size?: "sm" | "lg"; lang?: Language }) {
  const dimensions = size === "lg" ? 80 : 32;
  void lang;

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
    </div>
  );
}
