import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TELEGRAM_API_BASE = "https://api.telegram.org";

const DEFAULT_COMMANDS = [
  { command: "start", description: "Bot bilan boshlash" },
  { command: "help", description: "Misollar va yo'riqnoma" },
  { command: "new", description: "Suhbatni yangilash" },
];

const ENGLISH_COMMANDS = [
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Help and examples" },
  { command: "new", description: "Start a fresh chat" },
];

const DEFAULT_DESCRIPTION =
  "Alisher Sadullaevning ommaviy postlari, intervyulari va chiqishlari asosida savollarga javob beradigan bot. Yoshlar, ta'lim, tadbirkorlik, hududiy imkoniyatlar va shaxmat haqida so'rang.";

const ENGLISH_DESCRIPTION =
  "Ask questions about Alisher Sadullaev's public views on youth, education, entrepreneurship, regional opportunity, and chess.";

const DEFAULT_SHORT_DESCRIPTION =
  "Alisher Sadullaevga savol bering. Javoblar ommaviy manbalar asosida.";

const ENGLISH_SHORT_DESCRIPTION =
  "Ask Alisher Sadullaev questions grounded in public sources.";

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
    allowed_updates: ["message"],
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
