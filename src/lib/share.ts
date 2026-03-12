import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "./analytics";
import type { Language } from "./prompts";

export type SharePayload = {
  question: string;
  answer: string;
  lang: Language;
};

export type ShareRecord = SharePayload & {
  id: string;
};

function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function normalizeLang(value: string): Language {
  return value === "uz" ? "uz" : "en";
}

export function cleanQuestion(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 300);
}

export function cleanAnswer(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()
    .slice(0, 1600);
}

export function truncateShareText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}...`;
}

export function getSharePayloadFromSearchParams(params: {
  q?: string | string[];
  a?: string | string[];
  lang?: string | string[];
}): SharePayload | null {
  const question = cleanQuestion(getSingleValue(params.q));
  const answer = cleanAnswer(getSingleValue(params.a));
  const lang = normalizeLang(getSingleValue(params.lang));

  if (!question || !answer) {
    return null;
  }

  return { question, answer, lang };
}

export function buildLegacySharePageUrl(payload: SharePayload) {
  const params = new URLSearchParams({
    q: payload.question,
    a: payload.answer,
    lang: payload.lang,
    utm_source: "share",
    utm_medium: "organic",
    utm_campaign: "ask_alisher_answer_share",
  });
  return `/share?${params.toString()}`;
}

export function buildLegacyShareImageUrl(payload: SharePayload) {
  const params = new URLSearchParams({
    q: payload.question,
    a: payload.answer,
    lang: payload.lang,
  });
  return `/api/share-image?${params.toString()}`;
}

export function buildShareMetaTitle(payload: SharePayload) {
  const suffix = payload.lang === "uz" ? "Ask Alisher javobi" : "Ask Alisher's answer";
  return `${truncateShareText(payload.question, 60)} — ${suffix}`;
}

export function buildShareMetaDescription(payload: SharePayload) {
  if (payload.lang === "uz") {
    return `"${truncateShareText(
      payload.question,
      84
    )}" savoliga berilgan javobni oching va suhbatni shu joydan davom ettiring.`;
  }

  return `Open Ask Alisher's answer to "${truncateShareText(
    payload.question,
    84
  )}" and continue the thread from there.`;
}

export async function createShareRecord(payload: SharePayload) {
  const supabase = getSupabaseServiceRoleClient();
  const question = cleanQuestion(payload.question);
  const answer = cleanAnswer(payload.answer);
  const lang = normalizeLang(payload.lang);

  if (!question || !answer) {
    throw new Error("Question and answer are required");
  }

  const { data, error } = await supabase
    .from(ASK_ALISHER_ANALYTICS_TABLE)
    .insert({
      event_name: "askalisher_share_payload",
      language: lang,
      page_path: "/share",
      metadata: {
        question,
        answer,
        lang,
      },
    })
    .select("id, language, metadata")
    .single<{
      id: number;
      language: string | null;
      metadata: Record<string, unknown> | null;
    }>();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create share record");
  }

  return {
    id: String(data.id),
    question,
    answer,
    lang,
  } satisfies ShareRecord;
}

export async function fetchShareRecord(id: string): Promise<ShareRecord | null> {
  const normalizedId = id.trim();
  if (!/^\d+$/u.test(normalizedId)) {
    return null;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(ASK_ALISHER_ANALYTICS_TABLE)
    .select("id, language, metadata")
    .eq("id", Number(normalizedId))
    .eq("event_name", "askalisher_share_payload")
    .maybeSingle<{
      id: number;
      language: string | null;
      metadata: Record<string, unknown> | null;
    }>();

  if (error) {
    throw new Error(error.message);
  }

  const question = cleanQuestion(typeof data?.metadata?.question === "string" ? data.metadata.question : "");
  const answer = cleanAnswer(typeof data?.metadata?.answer === "string" ? data.metadata.answer : "");
  const lang = normalizeLang(
    typeof data?.metadata?.lang === "string"
      ? data.metadata.lang
      : typeof data?.language === "string"
        ? data.language
        : "en"
  );

  if (!data || !question || !answer) {
    return null;
  }

  return {
    id: String(data.id),
    question,
    answer,
    lang,
  };
}
