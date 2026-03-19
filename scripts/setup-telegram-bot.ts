import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const DEFAULT_COMMANDS = [
  { command: "start", description: "Bot bilan boshlash" },
  { command: "help", description: "Misollar va yo'riqnoma" },
  { command: "examples", description: "Savol g'oyalarini ko'rish" },
  { command: "recent", description: "So'nggi mavzularni ko'rish" },
  { command: "about", description: "Alisher Sadullaev haqida" },
  { command: "lang", description: "Tilni o'zgartirish" },
  { command: "new", description: "Suhbatni yangilash" },
];

const ENGLISH_COMMANDS = [
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Examples and instructions" },
  { command: "examples", description: "See question ideas" },
  { command: "recent", description: "Latest topics" },
  { command: "about", description: "About Alisher Sadullaev" },
  { command: "lang", description: "Change language" },
  { command: "new", description: "Start a new conversation" },
];

const DEFAULT_DESCRIPTION =
  "Alisher Sadullaevning AI kloni — senator, yoshlar yetakchisi, shaxmat targ'ibotchisi, Stanford GSB Executive. Savol yuboring va javobni uning ommaviy postlari, intervyulari hamda chiqishlari asosida oling.";

const ENGLISH_DESCRIPTION =
  "AI clone of Alisher Sadullaev — senator, youth leader, chess advocate, Stanford GSB Executive. Ask a question and get answers based on his public posts, interviews, and talks.";

const DEFAULT_SHORT_DESCRIPTION =
  "Alisher Sadullaevning AI kloni — senator, yoshlar yetakchisi, shaxmat targ'ibotchisi, Stanford GSB Executive.";

const ENGLISH_SHORT_DESCRIPTION =
  "AI clone of Alisher Sadullaev — senator, youth leader, chess advocate, Stanford GSB Executive.";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function telegramCall(method: string, body: Record<string, unknown>) {
  const token = getRequiredEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    result?: unknown;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(`${method} failed: ${payload.description || response.statusText}`);
  }

  return payload.result;
}

async function telegramMultipartCall(method: string, formData: FormData) {
  const token = getRequiredEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    result?: unknown;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(`${method} failed: ${payload.description || response.statusText}`);
  }

  return payload.result;
}

async function setTelegramProfilePhoto() {
  const photoPath = path.join(process.cwd(), "public", "alisher.jpg");
  if (!existsSync(photoPath)) return;

  const photo = readFileSync(photoPath);
  const formData = new FormData();
  formData.set(
    "photo",
    JSON.stringify({
      type: "static",
      photo: "attach://bot_photo",
    })
  );
  formData.set("bot_photo", new Blob([photo], { type: "image/jpeg" }), "alisher.jpg");

  await telegramMultipartCall("setMyProfilePhoto", formData);
}

async function main() {
  const siteUrl = getRequiredEnv("SITE_URL").replace(/\/$/, "");
  const webhookSecret = getRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  await telegramCall("setMyCommands", {
    commands: DEFAULT_COMMANDS,
  });

  await telegramCall("setMyCommands", {
    language_code: "en",
    commands: ENGLISH_COMMANDS,
  });

  await telegramCall("setMyDescription", {
    description: DEFAULT_DESCRIPTION,
  });

  await telegramCall("setMyDescription", {
    language_code: "en",
    description: ENGLISH_DESCRIPTION,
  });

  await telegramCall("setMyShortDescription", {
    short_description: DEFAULT_SHORT_DESCRIPTION,
  });

  await telegramCall("setMyShortDescription", {
    language_code: "en",
    short_description: ENGLISH_SHORT_DESCRIPTION,
  });

  await telegramCall("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Ask Alisher",
      web_app: {
        url: siteUrl,
      },
    },
  });

  await setTelegramProfilePhoto();

  await telegramCall("setWebhook", {
    url: webhookUrl,
    secret_token: webhookSecret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  const webhookInfo = await telegramCall("getWebhookInfo", {});

  console.log(
    JSON.stringify(
      {
        webhookUrl,
        webhookInfo,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
