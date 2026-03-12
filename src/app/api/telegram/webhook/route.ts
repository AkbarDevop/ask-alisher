import { consumeAskAlisherRateLimit } from "@/lib/rate-limit";
import {
  answerTelegramCallbackQuery,
  buildTelegramHelpText,
  buildTelegramNonTextReply,
  buildTelegramRateLimitReply,
  buildTelegramResetText,
  buildTelegramWelcomeText,
  clearTelegramHistory,
  fetchTelegramConversation,
  formatTelegramAnswer,
  getTelegramFeedbackValue,
  getTelegramMessageLanguage,
  getTelegramQuickActionPrompt,
  getTelegramWebhookSecret,
  isTelegramFeedbackAction,
  isTelegramQuickAction,
  requestAskAlisherReply,
  sendTelegramMessage,
  sendTelegramTyping,
  storeTelegramEvent,
  storeTelegramTurn,
} from "@/lib/telegram-bot";

export const maxDuration = 60;

const TELEGRAM_RATE_LIMIT = 12;
const TELEGRAM_RATE_WINDOW_SECONDS = 60;

type TelegramActor = {
  id?: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat?: {
    id: number;
    type?: string;
  };
  from?: TelegramActor;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
    from?: TelegramActor;
  };
};

function matchesCommand(text: string, command: string) {
  return new RegExp(`^/${command}(?:@\\w+)?\\b`, "iu").test(text.trim());
}

function getPublicSiteUrl(req: Request) {
  return (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

async function handleTelegramConversationTurn(params: {
  chatId: number;
  text: string;
  replyToMessageId: number;
  actor?: TelegramActor;
  requestOrigin: string;
  source: "message" | "quick_action";
  quickAction?: string;
  fallbackLanguage?: "uz" | "en";
}) {
  const rateLimit = await consumeAskAlisherRateLimit(
    `telegram:${params.chatId}`,
    TELEGRAM_RATE_LIMIT,
    TELEGRAM_RATE_WINDOW_SECONDS
  );

  if (!rateLimit.allowed) {
    await sendTelegramMessage({
      chatId: params.chatId,
      replyToMessageId: params.replyToMessageId,
      text: buildTelegramRateLimitReply(params.fallbackLanguage || "uz"),
    }).catch((error) => {
      console.error("Telegram rate-limit reply failed:", error);
    });

    return;
  }

  await sendTelegramTyping(params.chatId).catch((error) => {
    console.error("Telegram typing indicator failed:", error);
  });

  const conversationState = await fetchTelegramConversation(params.chatId, 10).catch((error) => {
    console.error("Telegram history fetch failed:", error);
    return {
      messages: [],
      language: params.fallbackLanguage || getTelegramMessageLanguage(params.text),
    };
  });
  const language =
    params.source === "quick_action"
      ? params.fallbackLanguage || conversationState.language
      : getTelegramMessageLanguage(params.text);
  const conversation = [...conversationState.messages, { role: "user" as const, content: params.text }].slice(-10);

  try {
    const { answer, sources } = await requestAskAlisherReply({
      origin: params.requestOrigin,
      messages: conversation,
    });

    if (!answer) {
      throw new Error("Telegram bot received an empty answer");
    }

    await storeTelegramTurn({
      chatId: params.chatId,
      role: "user",
      text: params.text,
      language,
      telegramUserId: params.actor?.id,
      telegramUsername: params.actor?.username,
      telegramFirstName: params.actor?.first_name,
      telegramMessageId: params.replyToMessageId,
      metadata: {
        source: params.source,
        quick_action: params.quickAction ?? null,
      },
    }).catch((error) => {
      console.error("Telegram user turn store failed:", error);
    });

    await storeTelegramTurn({
      chatId: params.chatId,
      role: "assistant",
      text: answer,
      language,
      telegramUserId: params.actor?.id,
      telegramUsername: params.actor?.username,
      telegramFirstName: params.actor?.first_name,
      metadata: {
        source: params.source,
        quick_action: params.quickAction ?? null,
      },
    }).catch((error) => {
      console.error("Telegram assistant turn store failed:", error);
    });

    if (params.source === "quick_action" && params.quickAction) {
      await storeTelegramEvent({
        chatId: params.chatId,
        eventName: "askalisher_telegram_quick_action",
        language,
        telegramUserId: params.actor?.id,
        telegramUsername: params.actor?.username,
        telegramFirstName: params.actor?.first_name,
        telegramMessageId: params.replyToMessageId,
        metadata: {
          action: params.quickAction,
          prompt: params.text,
          answer_preview: answer.slice(0, 280),
        },
      }).catch((error) => {
        console.error("Telegram quick-action analytics store failed:", error);
      });
    }

    const formattedReply = formatTelegramAnswer(answer, sources, language);

    await sendTelegramMessage({
      chatId: params.chatId,
      replyToMessageId: params.replyToMessageId,
      text: formattedReply.text,
      replyMarkup: formattedReply.replyMarkup,
      parseMode: formattedReply.parseMode,
    });
  } catch (error) {
    console.error("Telegram webhook handling failed:", error);

    await sendTelegramMessage({
      chatId: params.chatId,
      replyToMessageId: params.replyToMessageId,
      text:
        language === "uz"
          ? "Hozir javob berishda muammo bo'ldi. Birozdan keyin qayta urinib ko'ring."
          : "There was a problem generating the answer. Please try again shortly.",
    }).catch((sendError) => {
      console.error("Telegram error reply failed:", sendError);
    });
  }
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

  const requestOrigin = new URL(req.url).origin;
  const siteUrl = getPublicSiteUrl(req);
  const callbackQuery = update.callback_query;

  if (callbackQuery?.from?.is_bot) {
    return Response.json({ ok: true });
  }

  if (callbackQuery?.message?.chat?.id && callbackQuery.data) {
    const chatId = callbackQuery.message.chat.id;
    const callbackLanguage = getTelegramMessageLanguage(callbackQuery.message.text || "");

    if (isTelegramFeedbackAction(callbackQuery.data)) {
      await storeTelegramEvent({
        chatId,
        eventName: "askalisher_telegram_feedback",
        language: callbackLanguage,
        telegramUserId: callbackQuery.from?.id,
        telegramUsername: callbackQuery.from?.username,
        telegramFirstName: callbackQuery.from?.first_name,
        telegramMessageId: callbackQuery.message.message_id,
        metadata: {
          feedback: getTelegramFeedbackValue(callbackQuery.data),
          callback_data: callbackQuery.data,
          answer_preview: (callbackQuery.message.text || "").slice(0, 280),
        },
      }).catch((error) => {
        console.error("Telegram feedback analytics store failed:", error);
      });

      await answerTelegramCallbackQuery({
        callbackQueryId: callbackQuery.id,
        text: callbackLanguage === "en" ? "Thanks, noted." : "Rahmat, belgilab qo'ydim.",
      }).catch((error) => {
        console.error("Telegram feedback callback answer failed:", error);
      });

      return Response.json({ ok: true });
    }

    if (isTelegramQuickAction(callbackQuery.data)) {
      const prompt = getTelegramQuickActionPrompt(callbackQuery.data, callbackLanguage);

      await answerTelegramCallbackQuery({
        callbackQueryId: callbackQuery.id,
        text: callbackLanguage === "en" ? "Working on it..." : "Davom ettiryapman...",
      }).catch((error) => {
        console.error("Telegram quick-action callback answer failed:", error);
      });

      if (prompt) {
        await handleTelegramConversationTurn({
          chatId,
          text: prompt,
          replyToMessageId: callbackQuery.message.message_id,
          actor: callbackQuery.from,
          requestOrigin,
          source: "quick_action",
          quickAction: callbackQuery.data,
          fallbackLanguage: callbackLanguage,
        });
      }

      return Response.json({ ok: true });
    }

    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
    }).catch((error) => {
      console.error("Telegram callback answer failed:", error);
    });

    return Response.json({ ok: true });
  }

  const message = update.message;
  if (!message?.chat?.id || message.from?.is_bot) {
    return Response.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text?.trim() || "";

  if (!text) {
    await sendTelegramMessage({
      chatId,
      replyToMessageId: message.message_id,
      text: buildTelegramNonTextReply("uz"),
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
      text: buildTelegramResetText("uz"),
    }).catch((error) => {
      console.error("Telegram /new reply failed:", error);
    });

    return Response.json({ ok: true });
  }

  await handleTelegramConversationTurn({
    chatId,
    text,
    replyToMessageId: message.message_id,
    actor: message.from,
    requestOrigin,
    source: "message",
  });

  return Response.json({ ok: true });
}
