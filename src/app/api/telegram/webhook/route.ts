import { consumeAskAlisherRateLimit } from "@/lib/rate-limit";
import {
  buildTelegramHelpText,
  buildTelegramWelcomeText,
  clearTelegramHistory,
  fetchTelegramHistory,
  formatTelegramAnswer,
  getTelegramMessageLanguage,
  getTelegramWebhookSecret,
  requestAskAlisherReply,
  sendTelegramMessage,
  sendTelegramTyping,
  storeTelegramTurn,
} from "@/lib/telegram-bot";

export const maxDuration = 60;

const TELEGRAM_RATE_LIMIT = 12;
const TELEGRAM_RATE_WINDOW_SECONDS = 60;

type TelegramUpdate = {
  message?: {
    message_id: number;
    text?: string;
    chat?: {
      id: number;
      type?: string;
    };
    from?: {
      id?: number;
      is_bot?: boolean;
      username?: string;
      first_name?: string;
    };
  };
};

function matchesCommand(text: string, command: string) {
  return new RegExp(`^/${command}(?:@\\w+)?\\b`, "iu").test(text.trim());
}

function getPublicSiteUrl(req: Request) {
  return (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const secret = getTelegramWebhookSecret();
    if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  } catch (error) {
    console.error("Telegram webhook misconfigured:", error);
    return new Response("Configuration error", { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  if (!message?.chat?.id || message.from?.is_bot) {
    return Response.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text?.trim() || "";
  const requestOrigin = new URL(req.url).origin;
  const siteUrl = getPublicSiteUrl(req);

  if (!text) {
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: "Hozircha faqat matnli savollarni qabul qilaman.",
    }).catch((error) => {
      console.error("Telegram non-text reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  if (matchesCommand(text, "start")) {
    await clearTelegramHistory(chatId).catch((error) => {
      console.error("Telegram history reset on /start failed:", error);
    });
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: buildTelegramWelcomeText(siteUrl),
    }).catch((error) => {
      console.error("Telegram /start reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  if (matchesCommand(text, "help")) {
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: buildTelegramHelpText(siteUrl),
    }).catch((error) => {
      console.error("Telegram /help reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  if (matchesCommand(text, "new") || matchesCommand(text, "clear")) {
    await clearTelegramHistory(chatId).catch((error) => {
      console.error("Telegram history clear failed:", error);
    });
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: "Suhbat yangidan boshlandi. Yangi savolingizni yuboring.",
    }).catch((error) => {
      console.error("Telegram /new reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  const rateLimit = await consumeAskAlisherRateLimit(
    `telegram:${chatId}`,
    TELEGRAM_RATE_LIMIT,
    TELEGRAM_RATE_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib qayta urinib ko'ring.",
    }).catch((error) => {
      console.error("Telegram rate-limit reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  await sendTelegramTyping(chatId).catch((error) => {
    console.error("Telegram typing indicator failed:", error);
  });

  const language = getTelegramMessageLanguage(text);
  const history = await fetchTelegramHistory(chatId, 10).catch((error) => {
    console.error("Telegram history fetch failed:", error);
    return [];
  });

  const conversation = [...history, { role: "user" as const, content: text }].slice(-10);

  try {
    const { answer, sources } = await requestAskAlisherReply({
      origin: requestOrigin,
      messages: conversation,
    });

    if (!answer) {
      throw new Error("Telegram bot received an empty answer");
    }

    await storeTelegramTurn({
      chatId,
      role: "user",
      text,
      language,
      telegramUserId: message.from?.id,
      telegramUsername: message.from?.username,
      telegramFirstName: message.from?.first_name,
      telegramMessageId: message.message_id,
    }).catch((error) => {
      console.error("Telegram user turn store failed:", error);
    });

    await storeTelegramTurn({
      chatId,
      role: "assistant",
      text: answer,
      language,
      telegramUserId: message.from?.id,
      telegramUsername: message.from?.username,
      telegramFirstName: message.from?.first_name,
    }).catch((error) => {
      console.error("Telegram assistant turn store failed:", error);
    });

    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: formatTelegramAnswer(answer, sources, language),
    });
  } catch (error) {
    console.error("Telegram webhook handling failed:", error);

    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text:
        language === "uz"
          ? "Hozir javob berishda muammo bo'ldi. Birozdan keyin qayta urinib ko'ring."
          : "There was a problem generating the answer. Please try again shortly.",
    }).catch((sendError) => {
      console.error("Telegram error reply failed:", sendError);
    });
  }

  return Response.json({ ok: true });
}
