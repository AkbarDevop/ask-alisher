import { createClient } from "@supabase/supabase-js";
import { ASK_ALISHER_ANALYTICS_TABLE } from "@/lib/analytics";
import { SUGGESTED_QUESTIONS, type Language } from "@/lib/prompts";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TelegramSource = {
  title: string;
  url: string;
};

type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
};

type TelegramParseMode = "HTML";

type StoredTelegramTurn = {
  language?: string | null;
  metadata: Record<string, unknown> | null;
};

type TelegramConversationState = {
  messages: ChatMessage[];
  language: Language;
};

const TELEGRAM_TURN_EVENT = "askalisher_telegram_turn";
const TELEGRAM_MAX_MESSAGE_LENGTH = 3900;

const TELEGRAM_CALLBACK_MORE = "tg:more";
const TELEGRAM_CALLBACK_SHORTER = "tg:short";
const TELEGRAM_CALLBACK_EXAMPLE = "tg:example";
const TELEGRAM_CALLBACK_FEEDBACK_UP = "tg:fb:up";
const TELEGRAM_CALLBACK_FEEDBACK_DOWN = "tg:fb:down";
const TELEGRAM_CALLBACK_LANG_UZ = "tg:lang:uz";
const TELEGRAM_CALLBACK_LANG_EN = "tg:lang:en";

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

function shouldSuppressTelegramSources(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();

  return [
    /i haven't spoken publicly about/u,
    /i have not spoken publicly about/u,
    /that's not something i've shared/u,
    /that is not something i've shared/u,
    /i don't have any information on that/u,
    /i do not have any information on that/u,
    /bu haqda ochiq gapirmaganman/u,
    /haqida ochiq gapirmaganman/u,
    /bu mavzu bo'yicha ochiq fikr bildirganim yo'q/u,
    /ochiq fikr bildirganim yo'q/u,
    /bu haqda menda ma'lumot yo'q/u,
    /buni omma bilan ulashmaganman/u,
  ].some((pattern) => pattern.test(normalized));
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

export async function answerTelegramCallbackQuery(params: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}) {
  await sendTelegramApi("answerCallbackQuery", {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: params.showAlert,
  });
}

export async function sendTelegramMessage(params: {
  chatId: number;
  text: string;
  replyToMessageId?: number;
  replyMarkup?: TelegramReplyMarkup;
  parseMode?: TelegramParseMode;
}) {
  await sendTelegramApi("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    reply_to_message_id: params.replyToMessageId,
    disable_web_page_preview: true,
    reply_markup: params.replyMarkup,
    parse_mode: params.parseMode,
  });
}

export async function storeTelegramEvent(params: {
  chatId: number;
  eventName: string;
  language?: Language;
  telegramUserId?: number;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramMessageId?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from(ASK_ALISHER_ANALYTICS_TABLE).insert({
    event_name: params.eventName,
    session_id: getTelegramSessionId(params.chatId),
    language: params.language ?? null,
    hostname: "telegram",
    page_path: "/telegram",
    metadata: {
      telegram_chat_id: params.chatId,
      telegram_user_id: params.telegramUserId ?? null,
      telegram_username: params.telegramUsername ?? null,
      telegram_first_name: params.telegramFirstName ?? null,
      telegram_message_id: params.telegramMessageId ?? null,
      ...(params.metadata || {}),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
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
  metadata?: Record<string, unknown>;
}) {
  await storeTelegramEvent({
    chatId: params.chatId,
    eventName: TELEGRAM_TURN_EVENT,
    language: params.language,
    telegramUserId: params.telegramUserId,
    telegramUsername: params.telegramUsername,
    telegramFirstName: params.telegramFirstName,
    telegramMessageId: params.telegramMessageId,
    metadata: {
      role: params.role,
      text: cleanTelegramText(params.text),
      ...(params.metadata || {}),
    },
  });
}

export async function fetchTelegramConversation(chatId: number, limit = 10): Promise<TelegramConversationState> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from(ASK_ALISHER_ANALYTICS_TABLE)
    .select("language, metadata")
    .eq("event_name", TELEGRAM_TURN_EVENT)
    .eq("session_id", getTelegramSessionId(chatId))
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as StoredTelegramTurn[] | null) ?? []).reverse();
  const messages = rows
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
  const lastExplicitLanguage = [...rows]
    .reverse()
    .find((row) => row.language === "en" || row.language === "uz")?.language;
  const inferredLanguage =
    lastExplicitLanguage === "en" || lastExplicitLanguage === "uz"
      ? lastExplicitLanguage
      : detectLanguage(messages.filter((message) => message.role === "user").at(-1)?.content || "");

  return {
    messages,
    language: inferredLanguage,
  };
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

export function isTelegramQuickAction(data: string) {
  return [TELEGRAM_CALLBACK_MORE, TELEGRAM_CALLBACK_SHORTER, TELEGRAM_CALLBACK_EXAMPLE].includes(data);
}

export function isTelegramFeedbackAction(data: string) {
  return [TELEGRAM_CALLBACK_FEEDBACK_UP, TELEGRAM_CALLBACK_FEEDBACK_DOWN].includes(data);
}

export function getTelegramQuickActionPrompt(action: string, language: Language): string | null {
  if (language === "en") {
    if (action === TELEGRAM_CALLBACK_MORE) {
      return "Please explain the previous answer in more detail without changing the topic.";
    }
    if (action === TELEGRAM_CALLBACK_SHORTER) {
      return "Please restate the previous answer in 2 or 3 shorter sentences.";
    }
    if (action === TELEGRAM_CALLBACK_EXAMPLE) {
      return "Please give one concrete example for the previous answer.";
    }
    return null;
  }

  if (action === TELEGRAM_CALLBACK_MORE) {
    return "Oldingi javobni mavzudan chiqmasdan batafsilroq tushuntirib bering.";
  }
  if (action === TELEGRAM_CALLBACK_SHORTER) {
    return "Oldingi javobni 2-3 gapda qisqaroq qilib ayting.";
  }
  if (action === TELEGRAM_CALLBACK_EXAMPLE) {
    return "Oldingi javob bo'yicha bitta aniq misol keltiring.";
  }
  return null;
}

export function getTelegramFeedbackValue(data: string): "up" | "down" | null {
  if (data === TELEGRAM_CALLBACK_FEEDBACK_UP) return "up";
  if (data === TELEGRAM_CALLBACK_FEEDBACK_DOWN) return "down";
  return null;
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

function trimTelegramSourceLabel(label: string, maxLength = 32) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...`;
}

function escapeTelegramHtml(text: string) {
  return text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
}

function renderTelegramInlineFormatting(text: string) {
  return escapeTelegramHtml(text)
    .replace(/\*\*(.+?)\*\*/gu, "<b>$1</b>")
    .replace(/__(.+?)__/gu, "<b>$1</b>");
}

function normalizeTelegramAnswer(answer: string) {
  return answer
    .replace(/\r\n/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(
      /\b(Birinchidan|Ikkinchidan|Uchinchidan|To'rtinchidan|To‘rtinchidan|Beshinchidan|Oltinchidan|Yettinchidan|Sakkizinchidan|To'qqizinchidan|To‘qqizinchidan|First|Second|Third|Fourth|Finally)\.\s*\n+/gu,
      "$1, "
    )
    .replace(/\b(Va|va|And|and|But|but|Lekin|Ammo)\s*\n+/gu, "$1 ")
    .replace(/([,:;])\s*\n+(?=\p{L}|\p{N}|["'“‘(])/gu, "$1 ")
    .replace(/([^\n])\n(?!\n|[•\-])/gu, "$1 ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function splitTelegramAnswerIntoParagraphs(answer: string): string[] {
  const normalized = normalizeTelegramAnswer(answer);
  if (!normalized) return [];

  const existingParagraphs = normalized
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (existingParagraphs.length > 1) {
    return existingParagraphs;
  }

  const withTransitionBreaks = normalized.replace(
    /\s+(?=(Birinchidan|Ikkinchidan|Uchinchidan|To'rtinchidan|To‘rtinchidan|Beshinchidan|Oltinchidan|Yettinchidan|Sakkizinchidan|To'qqizinchidan|To‘qqizinchidan|Bundan tashqari|Shuningdek|Shu bilan birga|Masalan|Xususan|Ayniqsa|Natijada|Bu orqali|Bu tizim orqali|Finally|First|Second|Third|Fourth|Also|In addition|For example|That means|As a result)\b)/giu,
    "\n\n"
  );
  const transitionParagraphs = withTransitionBreaks
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (transitionParagraphs.length > 1) {
    return transitionParagraphs;
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [normalized];
  }

  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    const sentenceCount = current.split(/(?<=[.!?])\s+/u).filter(Boolean).length;

    if (current && (candidate.length > 260 || sentenceCount >= 2)) {
      paragraphs.push(current);
      current = sentence;
      continue;
    }

    current = candidate;
  }

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs;
}

function cleanTelegramParagraphs(paragraphs: string[]): string[] {
  const cleaned: string[] = [];
  const enumeratorPattern =
    /^(Birinchidan|Ikkinchidan|Uchinchidan|To'rtinchidan|To‘rtinchidan|Beshinchidan|Oltinchidan|Yettinchidan|Sakkizinchidan|To'qqizinchidan|To‘qqizinchidan|First|Second|Third|Fourth|Finally)[,.:]?$/u;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const current = paragraphs[index]?.replace(/\s+/gu, " ").trim();
    if (!current) continue;

    const next = paragraphs[index + 1]?.replace(/\s+/gu, " ").trim() || "";
    const enumeratorMatch = current.match(enumeratorPattern);

    if (enumeratorMatch && next) {
      cleaned.push(`${enumeratorMatch[1]}, ${next}`);
      index += 1;
      continue;
    }

    if (/^(Va|va|And|and|But|but|Lekin|Ammo)$/u.test(current)) {
      continue;
    }

    if (current.endsWith(",") && next && /^\p{L}/u.test(next)) {
      cleaned.push(`${current} ${next}`);
      index += 1;
      continue;
    }

    cleaned.push(current);
  }

  return cleaned;
}

function formatTelegramParagraph(paragraph: string, options?: { emphasizeLead?: boolean }) {
  const trimmed = paragraph.trim();
  if (!trimmed) return "";

  const enumeratorMatch = trimmed.match(
    /^(Birinchidan|Ikkinchidan|Uchinchidan|To'rtinchidan|To‘rtinchidan|Beshinchidan|Oltinchidan|Yettinchidan|Sakkizinchidan|To'qqizinchidan|To‘qqizinchidan|First|Second|Third|Fourth|Finally),\s*(.+)$/u
  );
  if (enumeratorMatch) {
    return `<b>${escapeTelegramHtml(enumeratorMatch[1])}.</b>\n${renderTelegramInlineFormatting(enumeratorMatch[2])}`;
  }

  if (!options?.emphasizeLead) {
    return renderTelegramInlineFormatting(trimmed);
  }

  const firstSentenceMatch = trimmed.match(/^.+?[.!?](?=\s|$)/u);
  if (
    firstSentenceMatch &&
    firstSentenceMatch[0].trim().length <= 180 &&
    !/(\*\*|__)/u.test(firstSentenceMatch[0])
  ) {
    const lead = firstSentenceMatch[0].trim();
    const remainder = trimmed.slice(firstSentenceMatch[0].length).trim();
    return remainder
      ? `<b>${escapeTelegramHtml(lead)}</b>\n${renderTelegramInlineFormatting(remainder)}`
      : `<b>${escapeTelegramHtml(lead)}</b>`;
  }

  return renderTelegramInlineFormatting(trimmed);
}

function formatTelegramAnswerText(answer: string): string {
  const paragraphs = cleanTelegramParagraphs(splitTelegramAnswerIntoParagraphs(answer));
  if (!paragraphs.length) {
    return trimTelegramMessage(renderTelegramInlineFormatting(answer.trim()));
  }

  const [firstParagraph, ...rest] = paragraphs;
  const formattedParagraphs: string[] = [formatTelegramParagraph(firstParagraph, { emphasizeLead: true })];

  for (const paragraph of rest) {
    formattedParagraphs.push(formatTelegramParagraph(paragraph));
  }

  return trimTelegramMessage(formattedParagraphs.join("\n\n"));
}

function getTelegramSourceLabel(source: TelegramSource, index: number, language: Language) {
  const title = source.title?.trim();
  const postMatch = title?.match(/Post #\d+/u);

  if (postMatch?.[0]) {
    return postMatch[0];
  }

  if (title) {
    return trimTelegramSourceLabel(title);
  }

  try {
    const hostname = new URL(source.url).hostname.replace(/^www\./u, "");
    return trimTelegramSourceLabel(hostname);
  } catch {
    return language === "uz" ? `Manba ${index + 1}` : `Source ${index + 1}`;
  }
}

function buildTelegramSourceKeyboard(
  sources: TelegramSource[],
  language: Language
): TelegramReplyMarkup | undefined {
  if (!sources.length) return undefined;

  return {
    inline_keyboard: sources.map((source, index) => [
      {
        text: getTelegramSourceLabel(source, index, language),
        url: source.url,
      },
    ]),
  };
}

export function formatTelegramAnswer(
  answer: string,
  sources: TelegramSource[],
  language: Language
): {
  text: string;
  replyMarkup?: TelegramReplyMarkup;
  parseMode?: TelegramParseMode;
} {
  const formattedAnswer = formatTelegramAnswerText(answer);

  if (!sources.length || shouldSuppressTelegramSources(answer)) {
    return {
      text: formattedAnswer,
      parseMode: "HTML",
    };
  }

  const sourceHint =
    language === "uz"
      ? "<i>Manbalar pastdagi tugmalarda.</i>"
      : "<i>Sources are linked in the buttons below.</i>";
  const combined = `${formattedAnswer}\n\n${sourceHint}`;

  return {
    text: combined.length <= TELEGRAM_MAX_MESSAGE_LENGTH ? combined : formattedAnswer,
    replyMarkup: buildTelegramSourceKeyboard(sources, language),
    parseMode: "HTML",
  };
}

export function buildTelegramWelcomeText(siteUrl: string, language: Language = "uz") {
  if (language === "en") {
    return [
      "Hello! I'm the Ask Alisher Sadullaev bot.",
      "",
      "Send me a question. I answer based on Alisher Sadullaev's public posts, interviews, and talks.",
      "",
      "Try asking:",
      "• What is Marra on Mutolaa and how did the reading competition go?",
      "• What did you find at the Digital Hub in Andijon?",
      "• What does chess teach young people?",
      "• What mistakes do young founders make most often?",
      "",
      "Commands:",
      "/new — start a new conversation",
      "/help — examples and instructions",
      "/about — about Alisher Sadullaev",
      "/lang — change language",
      "",
      `Web version: ${siteUrl}`,
    ].join("\n");
  }
  return [
    "Assalomu alaykum! Men Ask Alisher Sadullaev botiman.",
    "",
    "Savolingizni yuboring. Men Alisher Sadullaevning ommaviy postlari, intervyulari va chiqishlari asosida javob beraman.",
    "Inglizcha ham yozishingiz mumkin.",
    "",
    "Masalan:",
    "• Mutolaa'dagi Marra nima va kitobxonlar musobaqasi qanday o'tdi?",
    "• Hududlardagi Yoshlar markazlari nimalarni o'z ichiga oladi?",
    "• Shaxmat yoshlar uchun nimani o'rgatadi?",
    "• Yosh founderlar eng ko'p qanday xato qiladi?",
    "",
    "Buyruqlar:",
    "/new — suhbatni yangidan boshlash",
    "/help — misollar va yo'riqnoma",
    "/about — Alisher Sadullaev haqida",
    "/lang — tilni o'zgartirish",
    "",
    `Web versiya: ${siteUrl}`,
  ].join("\n");
}

export function buildTelegramHelpText(siteUrl: string, language: Language = "uz") {
  if (language === "en") {
    return [
      "Send your question as plain text. You can write in Uzbek or English.",
      "",
      "Good examples:",
      "• What is Marra and how did 9,000 readers join a single reading challenge?",
      "• Why are you visiting so many regions lately?",
      "• What mistakes do young founders make most often?",
      "• How do you balance public service and youth work?",
      "",
      "/examples — question ideas",
      "/recent — latest topics summary",
      "/about — about Alisher Sadullaev",
      "/lang — change language",
      "/new — clear history and start fresh",
      "",
      "Answers are based on public posts, interviews, and talks.",
      `Web version: ${siteUrl}`,
    ].join("\n");
  }
  return [
    "Savolni oddiy matn ko'rinishida yuboring. O'zbekcha ham, inglizcha ham yozishingiz mumkin.",
    "",
    "Yaxshi ishlaydigan misollar:",
    "• Mutolaa'dagi Marra nima va 9000 kitobxon qanday birlashdi?",
    "• Nega so'nggi paytda ko'p hududlarga borayapsiz?",
    "• Yosh founderlar eng ko'p qanday xato qiladi?",
    "• Davlat xizmati va yoshlar bilan ishlash o'rtasida balansni qanday tutasiz?",
    "",
    "/examples — savol g'oyalari",
    "/recent — so'nggi mavzular",
    "/about — Alisher Sadullaev haqida",
    "/lang — tilni o'zgartirish",
    "/new — suhbatni yangidan boshlash",
    "",
    "Javoblar ommaviy postlar, intervyular va chiqishlarga tayangan holda beriladi.",
    `Web versiya: ${siteUrl}`,
  ].join("\n");
}

export function buildTelegramExamplesText(language: Language = "uz") {
  const sampleQuestions = SUGGESTED_QUESTIONS[language].slice(0, 8);

  const heading = language === "en"
    ? "Here are some good question ideas:"
    : "Mana bir nechta yaxshi savol g'oyalari:";

  return [
    heading,
    "",
    ...sampleQuestions.map((question) => `• ${question}`),
  ].join("\n");
}

export function getTelegramRecentCommandPrompt(language: Language) {
  return language === "en"
    ? "Using only the freshest public Telegram posts, interviews, and talks from the most recent period in the corpus, tell me the 3 or 4 themes being emphasized right now. If the newest public material is older than expected, say the exact latest date instead of pretending it is recent."
    : "Faqat korpusdagi eng yangi ommaviy Telegram postlari, intervyular va chiqishlarga tayangan holda, hozir eng ko'p ta'kidlanayotgan 3-4 mavzuni ayting. Agar eng yangi ommaviy material kutilganidan eski bo'lsa, uni recent deb ko'rsatmay, aniq oxirgi sanani ayting.";
}

export function isTelegramLanguageAction(data: string) {
  return data === TELEGRAM_CALLBACK_LANG_UZ || data === TELEGRAM_CALLBACK_LANG_EN;
}

export function getTelegramLanguageFromCallback(data: string): Language | null {
  if (data === TELEGRAM_CALLBACK_LANG_UZ) return "uz";
  if (data === TELEGRAM_CALLBACK_LANG_EN) return "en";
  return null;
}

export function buildTelegramLanguagePickerText(language: Language): {
  text: string;
  replyMarkup: TelegramReplyMarkup;
} {
  const text = language === "en"
    ? "Choose your language:"
    : "Tilni tanlang:";

  return {
    text,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: "O'zbekcha", callback_data: TELEGRAM_CALLBACK_LANG_UZ },
          { text: "English", callback_data: TELEGRAM_CALLBACK_LANG_EN },
        ],
      ],
    },
  };
}

export function buildTelegramLanguageConfirmText(language: Language) {
  return language === "en"
    ? "Language set to English."
    : "Til o'zbekchaga o'zgartirildi.";
}

export function buildTelegramAboutText(language: Language) {
  if (language === "en") {
    return [
      "<b>About Alisher Sadullaev</b>",
      "",
      "Senator of the Oliy Majlis of Uzbekistan, founder of the Youth Affairs Agency, chess advocate, and Stanford GSB Executive Education graduate.",
      "",
      "This bot is an AI clone that answers questions based on Alisher's public posts, interviews, talks, and speeches.",
      "",
      "It is not Alisher himself — answers are generated from publicly available materials.",
    ].join("\n");
  }
  return [
    "<b>Alisher Sadullaev haqida</b>",
    "",
    "O'zbekiston Oliy Majlisi senatori, Yoshlar ishlari agentligi asoschisi, shaxmat targ'ibotchisi, Stanford GSB Executive Education bitiruvchisi.",
    "",
    "Bu bot Alisherning ommaviy postlari, intervyulari, chiqishlari va nutqlari asosida savollarga javob beruvchi AI klondir.",
    "",
    "Bu Alisherning o'zi emas — javoblar ommaviy materiallar asosida yaratiladi.",
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
