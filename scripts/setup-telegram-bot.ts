const TELEGRAM_API_BASE = "https://api.telegram.org";

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

async function main() {
  const siteUrl = getRequiredEnv("SITE_URL").replace(/\/$/, "");
  const webhookSecret = getRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  await telegramCall("setMyCommands", {
    commands: [
      { command: "start", description: "Botni ishga tushirish" },
      { command: "help", description: "Yordam va misollar" },
      { command: "new", description: "Yangi suhbat boshlash" },
    ],
  });

  await telegramCall("setMyDescription", {
    description:
      "Alisher Sadullaevning ommaviy Telegram postlari, intervyulari va chiqishlari asosida savollarga javob beradigan bot.",
  });

  await telegramCall("setMyShortDescription", {
    short_description: "Alisher Sadullaevga savol bering",
  });

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
