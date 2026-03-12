import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "@/lib/analytics";
import type { Language } from "@/lib/prompts";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TelegramSource = {
  title: string;
  url: string;
};

type StoredTelegramTurn = {
  metadata: Record<string, unknown> | null;
};

const TELEGRAM_TURN_EVENT = "askalisher_telegram_turn";
const TELEGRAM_MAX_MESSAGE_LENGTH = 3900;

function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function getTelegramSessionId(chatId: number | string) {
  return `telegram-chat:${chatId}`;
}

function cleanTelegramText(value: string, maxLength = 2000) {
  return value.replace(/\s+\n/gu, "\n").trim().slice(0, maxLength);
}

function trimTelegramMessage(text: string, maxLength = TELEGRAM_MAX_MESSAGE_LENGTH) {
  const normalized = text.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`;
}

function detectLanguage(text: string): Language {
  const normalized = text.toLowerCase();
  if (/\b(what|how|why|who|when|where|should|can|could|would|advice|recent|latest)\b/iu.test(normalized)) {
    return "en";
  }
  return "uz";
}

function dedupeSources(sources: TelegramSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

export function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }
  return token;
}

export function getTelegramWebhookSecret() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
  }
  return secret;
}

export function getInternalApiSecret() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("Missing INTERNAL_API_SECRET");
  }
  return secret;
}

export async function sendTelegramApi(method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${getTelegramBotToken()}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Telegram ${method} failed with status ${response.status}: ${errorText}`);
  }

  const payload = (await response.json()) as { ok?: boolean; description?: string };
  if (!payload.ok) {
    throw new Error(`Telegram ${method} failed: ${payload.description || "Unknown error"}`);
  }

  return payload;
}

export async function sendTelegramTyping(chatId: number) {
  await sendTelegramApi("sendChatAction", {
    chat_id: chatId,
    action: "typing",
  });
}

export async function sendTelegramMessage(params: {
  chatId: number;
  text: string;
  replyToMessageId?: number;
}) {
  await sendTelegramApi("sendMessage", {
    chat_id: params.chatId,
    text: trimTelegramMessage(params.text),
    reply_to_message_id: params.replyToMessageId,
    disable_web_page_preview: true,
  });
}

export async function storeTelegramTurn(params: {
  chatId: number;
  role: "user" | "assistant";
  text: string;
  language: Language;
  telegramUserId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramMessageId?: number;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from(ASK_ALISHER_ANALYTICS_TABLE).insert({
    event_name: TELEGRAM_TURN_EVENT,
    session_id: getTelegramSessionId(params.chatId),
    language: params.language,
    hostname: "telegram",
    page_path: "/telegram",
    metadata: {
      role: params.role,
      text: cleanTelegramText(params.text),
      telegram_chat_id: params.chatId,
      telegram_user_id: params.telegramUserId ?? null,
      telegram_username: params.telegramUsername ?? null,
      telegram_first_name: params.telegramFirstName ?? null,
      telegram_message_id: params.telegramMessageId ?? null,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchTelegramHistory(chatId: number, limit = 10): Promise<ChatMessage[]> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(ASK_ALISHER_ANALYTICS_TABLE)
    .select("metadata")
    .eq("event_name", TELEGRAM_TURN_EVENT)
    .eq("session_id", getTelegramSessionId(chatId))
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as StoredTelegramTurn[] | null) ?? []).reverse();

  return rows
    .map((row) => {
      const role = row.metadata?.role === "assistant" ? "assistant" : "user";
      const content =
        typeof row.metadata?.text === "string" ? cleanTelegramText(row.metadata.text, 2000) : "";

      if (!content) return null;

      return {
        role,
        content,
      } satisfies ChatMessage;
    })
    .filter((row): row is ChatMessage => row !== null);
}

export async function clearTelegramHistory(chatId: number) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from(ASK_ALISHER_ANALYTICS_TABLE)
    .delete()
    .eq("event_name", TELEGRAM_TURN_EVENT)
    .eq("session_id", getTelegramSessionId(chatId));

  if (error) {
    throw new Error(error.message);
  }
}

export async function requestAskAlisherReply(params: {
  origin: string;
  messages: ChatMessage[];
}) {
  const response = await fetch(`${params.origin}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ask-alisher-internal": getInternalApiSecret(),
    },
    body: JSON.stringify({
      messages: params.messages,
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Ask Alisher chat failed with status ${response.status}: ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const sources: TelegramSource[] = [];
  let answer = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const frame = buffer.slice(0, boundaryIndex).trim();
      buffer = buffer.slice(boundaryIndex + 2);

      if (frame) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              url?: string;
              title?: string;
            };

            if (event.type === "text-delta" && typeof event.delta === "string") {
              answer += event.delta;
            }

            if (event.type === "source-url" && typeof event.url === "string" && event.url.startsWith("http")) {
              sources.push({
                title:
                  typeof event.title === "string" && event.title.trim()
                    ? event.title.trim()
                    : event.url,
                url: event.url,
              });
            }
          } catch {
            // Ignore malformed stream events.
          }
        }
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }

  return {
    answer: cleanTelegramText(answer, 3500),
    sources: dedupeSources(sources).slice(0, 2),
  };
}

export function formatTelegramAnswer(answer: string, sources: TelegramSource[], language: Language) {
  if (!sources.length) {
    return trimTelegramMessage(answer);
  }

  const sourceLabel = language === "uz" ? "Manbalar:" : "Sources:";
  const sourceBlock = `${sourceLabel}\n${sources.map((source) => `• ${source.url}`).join("\n")}`;
  const combined = `${answer.trim()}\n\n${sourceBlock}`;

  return trimTelegramMessage(
    combined.length <= TELEGRAM_MAX_MESSAGE_LENGTH ? combined : answer
  );
}

export function buildTelegramWelcomeText(siteUrl: string) {
  return [
    "Assalomu alaykum. Men Ask Alisher botiman.",
    "",
    "Savolingizni yuboring. Men Alisher Sadullaevning ommaviy postlari, intervyulari va chiqishlari asosida javob beraman.",
    "Xohlasangiz, savolni inglizcha ham yozishingiz mumkin.",
    "",
    "Masalan, shularni so'rab ko'ring:",
    "• Yosh founderlar eng ko'p qanday xato qiladi?",
    "• Hududlardagi yoshlar uchun qaysi imkoniyatlar eng muhim?",
    "• Shaxmat yoshlar uchun nimani o'rgatadi?",
    "",
    "Buyruqlar:",
    "/new — suhbatni yangidan boshlash",
    "/help — misollar va yo'riqnoma",
    "",
    `Web versiya: ${siteUrl}`,
  ].join("\n");
}

export function buildTelegramHelpText(siteUrl: string) {
  return [
    "Savolni oddiy matn ko'rinishida yuboring. O'zbekcha ham, inglizcha ham yozishingiz mumkin.",
    "",
    "Yaxshi ishlaydigan misollar:",
    "• Yosh founderlar eng ko'p qanday xato qiladi?",
    "• Shaxmat yoshlar uchun nimani o'rgatadi?",
    "• Hududlardagi yoshlar uchun qaysi imkoniyatlar eng muhim?",
    "• Davlat xizmati va yoshlar bilan ishlash o'rtasida balansni qanday tutasiz?",
    "",
    "Javoblar ommaviy postlar, intervyular va chiqishlarga tayangan holda beriladi.",
    "/new — suhbatni tozalaydi va yangidan boshlaydi",
    `Web versiya: ${siteUrl}`,
  ].join("\n");
}

export function buildTelegramResetText(language: Language) {
  return language === "en"
    ? "The chat was reset. Send your next question."
    : "Suhbat yangidan boshlandi. Yangi savolingizni yuboring.";
}

export function buildTelegramNonTextReply(language: Language) {
  return language === "en"
    ? "For now, I can only handle text questions."
    : "Hozircha faqat matnli savollarni qabul qilaman.";
}

export function buildTelegramRateLimitReply(language: Language) {
  return language === "en"
    ? "Too many requests were sent. Please wait a bit and try again."
    : "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib qayta urinib ko'ring.";
}

export function getTelegramMessageLanguage(text: string) {
  return detectLanguage(text);
}
